const supabaseClient = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );

    async function requireSession() {
      try {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error || !data.session) {
          window.location.href = "login.html";
          return false;
        }
        return true;
      } catch (error) {
        console.error("Session check failed:", error);
        window.location.href = "login.html";
        return false;
      }
    }

    async function loadRealStreak(userId) {
      const el = document.getElementById("streakText");
      const xpEl = document.getElementById("xpText");
      if (!el || !xpEl) return;

      const { data, error } = await supabaseClient
        .from("learner_events")
        .select("event_type,event_data,created_at")
        .eq("user_id", userId)
        .eq("event_type", "lesson_completed")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        el.textContent = "0 day streak";
        xpEl.textContent = "0 XP";
        return;
      }

      const completedEvents = data || [];
      const days = new Set(completedEvents.map(row => {
        const d = new Date(row.created_at);
        return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
      }).filter(Boolean));

      let streak = 0;
      const cursor = new Date();
      cursor.setHours(0,0,0,0);
      while (days.has(cursor.toLocaleDateString())) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }

      const xpTotal = completedEvents.reduce((sum,row) => {
        const earned = Number(row.event_data?.xp);
        return sum + (Number.isFinite(earned) && earned > 0 ? earned : 0);
      }, 0);

      xpEl.textContent = Math.round(xpTotal) + " XP";
      el.textContent = streak === 0 ? "0 day streak" : streak + (streak === 1 ? " day" : " days") + " streak";
    }

    async function generateNextCurriculumLesson(learnerLanguageId, languageName, level, existingLessons, afterSequence = 0) {
  const { data: nodes, error: nodeError } = await supabaseClient
    .from("curriculum_nodes")
    .select("id,sequence_number,stage_number,stage_name,title,situation,focus,level_band")
    .order("sequence_number", { ascending: true })
    .limit(100);
  if (nodeError) throw nodeError;

  const allowedBands = (level === "C1" || level === "C2") ? [level, "C1/C2"] : [level];
  const levelRank = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6, "C1/C2": 6 };
  const targetRank = levelRank[level] || 1;
  // Never let another CEFR band fill a gap in the learner's selected path.
  const levelMatches = node => allowedBands.includes(String(node.level_band || "").trim().toUpperCase());

  const { data: attempts } = await supabaseClient
    .from("lesson_attempts")
    .select("lesson_id")
    .in("lesson_id", (existingLessons || []).map(x => x.id));

  const completed = new Set((attempts || []).map(x => x.lesson_id));
  const usable = (nodes || []).filter(node => {
    if (Number(node.sequence_number || 0) <= Number(afterSequence || 0)) return false;
    const related = (existingLessons || []).filter(x => x.curriculum_node_id === node.id && x.level === level);
    return related.length === 0 || related.some(x => !completed.has(x.id)) ? levelMatches(node) : false;
  });

  if (!usable.length) return null;

  usable.sort((a,b) => {
    const ar = Math.abs((levelRank[a.level_band] ?? (a.level_band === "C1/C2" ? 6 : 1)) - targetRank);
    const br = Math.abs((levelRank[b.level_band] ?? (b.level_band === "C1/C2" ? 6 : 1)) - targetRank);
    return ar - br || a.sequence_number - b.sequence_number;
  });

  const node = usable[0];
  const memoryAttempts = existingLessons.length
    ? await supabaseClient
        .from("lesson_attempts")
        .select("lesson_id,score,responses,completed_at")
        .in("lesson_id", existingLessons.map(x => x.id))
        .order("completed_at", { ascending:false })
        .limit(8)
    : {data:[]};

  const memory = (memoryAttempts.data || []).map(attempt => ({
    lesson_id:attempt.lesson_id,
    score:attempt.score,
    responses:attempt.responses
  }));

  const response = await fetch("/api/generate-lesson", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      language:languageName,
      code:window.Nahtive_language_code || undefined,
      level,
      node,
      memory
    })
  });
  const generated = await response.json().catch(() => ({}));
  if (!response.ok || !generated.title || !generated.content) {
    throw new Error(generated.error || "Could not generate the next lesson.");
  }

  const payload = generated.content;
  const { data: saved, error: saveError } = await supabaseClient
    .from("lessons")
    .insert({
      learner_language_id: learnerLanguageId,
      curriculum_node_id: node.id,
      title:generated.title,
      topic:generated.topic || node.title,
      level,
      content:payload
    })
    .select("id,title,topic,level,content,created_at,curriculum_node_id,curriculum_nodes(sequence_number,stage_name,focus,level_band)")
    .single();

  if (saveError) throw saveError;
  return saved;
}

async function loadSavedLessons(learnerLanguageId, languageName) {
  const title = document.getElementById("recommendedTitle");
  const copy = document.getElementById("recommendedCopy");
  const meta = document.querySelector(".lesson-meta");
  const button = document.getElementById("startLessonButton");

  const { data: learner } = await supabaseClient
    .from("learner_languages")
    .select("level,languages(name,code)")
    .eq("id", learnerLanguageId)
    .maybeSingle();

  const learnerLevel = String(learner?.level || "A1").toUpperCase();
  window.Nahtive_language_code = learner?.languages?.code || "en-US";

  const { data: lessons, error } = await supabaseClient
    .from("lessons")
    .select("id,title,topic,level,content,created_at,curriculum_node_id,curriculum_nodes(sequence_number,stage_name,focus,level_band)")
    .eq("learner_language_id", learnerLanguageId)
    .limit(120);

  if (error) {
    console.error("Could not load lessons:", error);
    return;
  }

  // Only treat a lesson as part of the active path if it has the new teaching contract.
  // Older rows can remain in the database, but they must not be shown as the learner's next lesson.
  const isUsableLesson = row => {
    const phrases = Array.isArray(row?.content?.phrases) ? row.content.phrases : [];
    const dialogue = Array.isArray(row?.content?.dialogue) ? row.content.dialogue : [];
    const storedCode = String(row?.content?.language_code || "").toLowerCase();
    const wantedCode = String(learner?.languages?.code || window.Nahtive_language_code || "").toLowerCase();
    const requiredPhraseCount = 8;
    const challenge = row?.content?.final_challenge;
    const reading = row?.content?.reading_comprehension;
    return !!row?.curriculum_node_id && storedCode === wantedCode && phrases.length >= requiredPhraseCount &&
      phrases.slice(0,requiredPhraseCount).every(p => p && typeof p === "object" && p.target && p.meaning && p.usage && p.example &&
        Array.isArray(p.breakdown) && p.breakdown.length > 0 &&
        Array.isArray(p.verb_focus) && p.verb_focus.length > 0 &&
        p.verb_focus.every(v => v.form && v.lemma && v.meaning && v.tense && v.why_this_form &&
          v.check_question && Array.isArray(v.check_choices) && v.check_choices.length === 4 &&
          v.check_choices.includes(v.check_answer) && v.check_explanation) &&
        Array.isArray(p.distractors) && p.distractors.length >= 3) &&
      dialogue.length === 4 && !!reading && typeof reading.passage === "string" && reading.passage.trim() &&
      Array.isArray(reading.questions) && reading.questions.length === 4 &&
      !!challenge && typeof challenge.situation === "string" && challenge.situation.trim() &&
      typeof challenge.prompt === "string" && challenge.prompt.trim() && Array.isArray(challenge.choices) &&
      challenge.choices.length === 4 && typeof challenge.correct_answer === "string" && challenge.choices.includes(challenge.correct_answer);
  };

  const allowedBands = (learnerLevel === "C1" || learnerLevel === "C2") ? [learnerLevel, "C1/C2"] : [learnerLevel];
  let allLessons = (lessons || []).filter(row =>
    isUsableLesson(row) &&
    String(row.level || "A1").toUpperCase() === learnerLevel &&
    allowedBands.includes(String(row.curriculum_nodes?.level_band || "").trim().toUpperCase())
  );

  const completedResult = allLessons.length
    ? await supabaseClient.from("lesson_attempts").select("lesson_id").in("lesson_id", allLessons.map(row => row.id))
    : {data:[]};
  const completedIds = new Set((completedResult.data || []).map(row => row.lesson_id));

  allLessons.sort((a,b) => {
    const as = Number(a.curriculum_nodes?.sequence_number || 9999);
    const bs = Number(b.curriculum_nodes?.sequence_number || 9999);
    return as - bs || new Date(a.created_at) - new Date(b.created_at);
  });

  let lesson = allLessons.find(row => row.level === learnerLevel && !completedIds.has(row.id));
  if (!lesson) {
    lesson = allLessons.find(row => !completedIds.has(row.id));
  }

  if (!lesson) {
    // Start generation in the background instead of blocking the dashboard.
    title.textContent = "Your next lesson is being prepared.";
    copy.textContent = "Nahtive is preparing the next language-specific lesson in the background.";
    if (meta) meta.innerHTML = "<span>"+escapeHtml(languageName)+"</span><span class='meta-dot'></span><span>Preparing</span>";
    button.disabled = false;
    button.innerHTML = "Start lesson <span>→</span>";
    button.onclick = () => { window.location.href = "lesson.html"; };

    generateNextCurriculumLesson(learnerLanguageId, languageName, learnerLevel, allLessons)
      .then(prepared => {
        if (!prepared) {
          copy.textContent = "No curriculum lesson was available to prepare. Start lesson to retry.";
          return;
        }
        allLessons.push(prepared);
        title.textContent = prepared.title || "Continue learning";
        copy.textContent = (prepared.curriculum_nodes?.focus || "Real conversation") + " — then use it in a real interaction.";
        if (meta) meta.innerHTML = "<span>"+escapeHtml(languageName)+"</span><span class='meta-dot'></span><span>"+escapeHtml(prepared.curriculum_nodes?.stage_name || "Core path")+"</span>";
        button.innerHTML = "Continue <span>→</span>";
        button.onclick = () => {
          sessionStorage.setItem("Nahtive_lesson_id", prepared.id);
          window.location.href = "lesson.html?id=" + encodeURIComponent(prepared.id);
        };
      })
      .catch(generationError => {
        console.error("Could not prebuild next lesson:", generationError);
        title.textContent = "Your lesson isn't ready yet.";
        copy.textContent = "We couldn't prepare this lesson. Select Start lesson to retry.";
        button.innerHTML = "Try again <span>→</span>";
        button.onclick = () => { window.location.href = "lesson.html"; };
      });
    return;
  }

  const stage = lesson.curriculum_nodes?.stage_name || "Core path";
  const focus = lesson.curriculum_nodes?.focus || "Real conversation";
  title.textContent = lesson.title || "Continue learning";
  copy.textContent = focus + " — then use it in a real interaction.";
  if (meta) meta.innerHTML = "<span>"+escapeHtml(languageName)+"</span><span class='meta-dot'></span><span>"+escapeHtml(stage)+"</span>";
  button.innerHTML = completedIds.has(lesson.id) ? "Review scene <span>→</span>" : "Continue <span>→</span>";
  button.onclick = () => {
    sessionStorage.setItem("Nahtive_lesson_id", lesson.id);
    window.location.href = "lesson.html?id=" + encodeURIComponent(lesson.id);
  };

  // While the learner is working through this lesson, quietly prepare the following one.
  const currentSequence = Number(lesson.curriculum_nodes?.sequence_number || 0);
  const hasPreparedNext = currentSequence > 0 && allLessons.some(row =>
    !completedIds.has(row.id) &&
    Number(row.curriculum_nodes?.sequence_number || 0) > currentSequence
  );
  if (currentSequence > 0 && !hasPreparedNext) {
    generateNextCurriculumLesson(learnerLanguageId, languageName, learnerLevel, allLessons, currentSequence)
      .catch(error => console.error("Could not prebuild following lesson:", error));
  }
}

    async function addLanguage(languageName, button) {
      if (!languageName || !button) return;
      button.disabled = true;
      button.textContent = "Adding…";

      try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) { window.location.href = "login.html"; return; }

        const languageMap = {
          Spanish:"es", English:"en", Portuguese:"pt", French:"fr", Italian:"it",
          German:"de", Japanese:"ja", Korean:"ko", Mandarin:"zh", Arabic:"ar",
          Dutch:"nl", Swedish:"sv", Greek:"el", Turkish:"tr", Hindi:"hi", Polish:"pl"
        };
        const code = languageMap[languageName];
        if (!code) throw new Error("Unsupported language.");

        const { data: language, error: languageError } = await supabaseClient
          .from("languages").select("id").eq("code", code).single();
        if (languageError) throw languageError;

        const { data: existing } = await supabaseClient
          .from("learner_languages").select("id").eq("user_id", user.id).eq("language_id", language.id).maybeSingle();

        if (existing?.id) {
          await supabaseClient.from("learner_languages").update({is_current:true}).eq("user_id",user.id).eq("id",existing.id);
          await supabaseClient.from("learner_languages").update({is_current:false}).eq("user_id",user.id).neq("id",existing.id);
          localStorage.setItem("Nahtive_current_learner_language", existing.id);
          window.location.href="dashboard.html";
          return;
        }

        const { data: profileRow } = await supabaseClient.from("profiles").select("goal,interests").eq("id",user.id).maybeSingle();
        const goal = profileRow?.goal || "Conversation";
        const interests = Array.isArray(profileRow?.interests) && profileRow.interests.length ? profileRow.interests : ["EverydayLife"];

        await supabaseClient.from("learner_languages").update({is_current:false}).eq("user_id",user.id);
        const { data: learnerLanguage, error: learnerError } = await supabaseClient.from("learner_languages").insert({
          user_id:user.id, language_id:language.id, level:"A1", goal, interests, is_current:true
        }).select("id").single();
        if (learnerError) throw learnerError;

        await supabaseClient.from("learner_skills").upsert(
          ["vocabulary","grammar","understanding","conversation","confidence"].map(skill=>({
            learner_language_id:learnerLanguage.id, skill, mastery:0
          })),
          {onConflict:"learner_language_id,skill"}
        );

        localStorage.setItem("Nahtive_current_learner_language", learnerLanguage.id);
        window.location.href="dashboard.html";
      } catch (error) {
        console.error("Could not add language:",error);
        button.disabled=false;
        button.textContent=languageName;
        alert("We couldn't add that language yet. Please try again.");
      }
    }

    async function loadLearningProfile() {
      try {
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !sessionData.session) {
          window.location.href = "login.html";
          return;
        }

        const user = sessionData.session.user;

        const { data: learnerLanguages, error: learnerLanguagesError } = await supabaseClient
          .from("learner_languages")
          .select("id, level, goal, interests, is_current, languages(name, code)")
          .eq("user_id", user.id)
          .order("is_current", { ascending: false })
          .order("updated_at", { ascending: false });

        if (learnerLanguagesError) throw learnerLanguagesError;

        const savedCurrent = localStorage.getItem("Nahtive_current_learner_language") || localStorage.getItem("native_current_learner_language");
        const learnerLanguage = (learnerLanguages || []).find(row => row.id === savedCurrent) || (learnerLanguages || []).find(row => row.is_current) || (learnerLanguages || [])[0];

        if (!learnerLanguage) {
          window.location.href = "onboarding.html";
          return;
        }

        const languageName = learnerLanguage.languages?.name || "English";
        const level = String(learnerLanguage.level || "A1").toUpperCase();

        await loadRealStreak(user.id);
        localStorage.setItem("Nahtive_current_learner_language", learnerLanguage.id);

        await loadSavedLessons(learnerLanguage.id, languageName);

        const myLanguagesGrid = document.getElementById("myLanguagesGrid");
        if (myLanguagesGrid) {
          myLanguagesGrid.innerHTML = (learnerLanguages || []).map(language => {
            const name = language.languages?.name || "Language";
            const current = language.is_current;
            return '<div class="dashboard-language-link '+(current ? 'current' : '')+'" data-language-id="'+escapeHtml(language.id)+'"><span>'+escapeHtml(name)+' · '+escapeHtml(language.level || "A1")+'</span><button type="button" class="manage-button" data-manage-id="'+escapeHtml(language.id)+'">Manage</button></div>';
          }).join("") || '<div style="grid-column:1/-1;color:var(--muted);font-size:14px;">No languages added yet.</div>';
        }

        const { data: attempts, error: attemptsError } = await supabaseClient
          .from("lesson_attempts")
          .select("id, score, completed_at, lessons(title, learner_language_id, learner_languages(languages(name)))")
          .order("completed_at", { ascending: false })
          .limit(20);

        if (attemptsError) throw attemptsError;

        const completedCount = (attempts || []).filter(a => a.lessons?.learner_language_id === learnerLanguage.id).length;
        const progressPercent = document.getElementById("progressPercent");
        const progressDescription = document.getElementById("progressDescription");
        const progressFill = document.getElementById("progressFill");
        const progressFraction = document.getElementById("progressFraction");

        if (progressPercent) progressPercent.textContent = completedCount === 0 ? "Not started" : completedCount + (completedCount === 1 ? " lesson" : " lessons");
        if (progressDescription) progressDescription.textContent = completedCount === 0 ? "Complete a lesson to start tracking your progress." : "Completed lessons are now being tracked in your account.";
        if (progressFill) progressFill.style.width = Math.min(100, completedCount * 10) + "%";
        if (progressFraction) progressFraction.textContent = completedCount + " completed";

        const activityList = document.querySelector(".activity-list");
        if (activityList) {
          activityList.innerHTML = (attempts || []).slice(0, 6).map((attempt, index) => {
            const title = attempt.lessons?.title || "Lesson";
            const lang = attempt.lessons?.learner_languages?.languages?.name || "";
            const score = attempt.score == null ? "Completed" : Math.round(Number(attempt.score)) + "%";
            const date = new Date(attempt.completed_at);
            const when = Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
            const icons = ["blue", "green", "coral"];
            return '<div class="activity-item"><div class="activity-icon ' + icons[index % icons.length] + '">' + escapeHtml(title.charAt(0).toUpperCase()) + '</div><div><div class="activity-title">' + escapeHtml(title) + '</div><div class="activity-subtitle">Lesson' + (lang ? ' · ' + escapeHtml(lang) : '') + ' · ' + escapeHtml(when) + '</div></div><div class="activity-score">' + escapeHtml(score) + '</div></div>';
          }).join("") || '<div style="color:var(--muted);padding:18px 0;">No lessons completed yet.</div>';
        }

        const { data: skills, error: skillsError } = await supabaseClient
          .from("learner_skills")
          .select("mastery")
          .eq("learner_language_id", learnerLanguage.id);

        if (skillsError) throw skillsError;

        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "there";

        const avatarInitial = document.getElementById("avatarInitial");
        if (avatarInitial) {
          avatarInitial.textContent = displayName.charAt(0).toUpperCase();
        }

        const greeting = document.querySelector(".dashboard-hero h1");
        if (greeting) {
          greeting.innerHTML = "Keep going.<br>" + escapeHtml(displayName) + ", you're getting there.";
        }

        const dashboardLanguage = document.getElementById("dashboardLanguage");
        const recommendedLanguage = document.getElementById("recommendedLanguage");
        const dashboardLevel = document.getElementById("dashboardLevel");

        if (dashboardLanguage) dashboardLanguage.textContent = languageName;
        if (recommendedLanguage) recommendedLanguage.textContent = languageName;
        if (dashboardLevel) dashboardLevel.textContent = level;
        document.querySelectorAll("#myLanguagesGrid .dashboard-language-link").forEach(link => {
          link.addEventListener("click", async (event) => {
            if(event.target.closest(".manage-button")) return;
            event.preventDefault();
            const id=link.dataset.languageId;
            if(!id) return;
            await supabaseClient.from("learner_languages").update({is_current:false}).eq("user_id",user.id);
            await supabaseClient.from("learner_languages").update({is_current:true}).eq("id",id).eq("user_id",user.id);
            localStorage.setItem("Nahtive_current_learner_language",id);
            window.location.href="dashboard.html";
          });
        });
        document.querySelectorAll("[data-manage-id]").forEach(button => {
          button.addEventListener("click", (event) => {
            event.preventDefault(); event.stopPropagation();
            const lang=learnerLanguages.find(row => row.id===button.dataset.manageId);
            if(!lang) return;
            const hub=document.getElementById("languageHub");
            hub.classList.add("open");
            const name=lang.languages?.name||"Language", level=lang.level||"A1";
            hub.innerHTML="<div class='level-panel-head'><div><h3>"+escapeHtml(name)+" learning path</h3><p>Choose the level that matches your current ability.</p></div><button type='button' class='manage-button' id='closeHub'>Close</button></div><div class='level-options'>"+["A1","A2","B1","B2","C1","C2"].map(l=>"<button type='button' class='level-option "+(l===level?"active":"")+"' data-level='"+l+"'>"+l+"</button>").join("")+"</div><div class='hub-actions'><a href='assessment.html?language_id="+encodeURIComponent(lang.id)+"&return=dashboard'>Retake placement</a></div>";
            hub.querySelector("#closeHub").onclick=()=>hub.classList.remove("open");
            hub.querySelectorAll(".level-option").forEach(opt=>opt.onclick=async()=>{
              const newLevel=String(opt.dataset.level||"").toUpperCase();
              if(!["A1","A2","B1","B2","C1","C2"].includes(newLevel)) return;
              const previousLevel=String(lang.level||"A1").toUpperCase();
              hub.querySelectorAll(".level-option").forEach(button=>{button.disabled=true;});
              opt.textContent="Saving…";
              try {
                const {data:updated,error:updateError}=await supabaseClient
                  .from("learner_languages")
                  .update({level:newLevel,is_current:true})
                  .eq("id",lang.id)
                  .eq("user_id",user.id)
                  .select("id,level,is_current")
                  .maybeSingle();
                if(updateError) throw updateError;
                if(!updated || String(updated.level||"").toUpperCase()!==newLevel) {
                  throw new Error("The level wasn't saved. Your account may not have permission to update this learning path.");
                }
                const {error:clearCurrentError}=await supabaseClient
                  .from("learner_languages")
                  .update({is_current:false})
                  .eq("user_id",user.id)
                  .neq("id",lang.id);
                if(clearCurrentError) throw clearCurrentError;
                lang.level=newLevel;
                localStorage.setItem("Nahtive_current_learner_language",lang.id);
                const {error:eventError}=await supabaseClient.from("learner_events").insert({
                  user_id:user.id,
                  learner_language_id:lang.id,
                  event_type:"level_manually_changed",
                  event_data:{from:previousLevel,to:newLevel}
                });
                if(eventError) console.warn("Level saved, but change event could not be recorded:",eventError);
                const badge=document.getElementById("dashboardLevel");
                if(badge && lang.id===learnerLanguage.id) badge.textContent=newLevel;
                const languageLabel=document.querySelector('[data-language-id="'+CSS.escape(lang.id)+'"] span');
                if(languageLabel) languageLabel.textContent=(lang.languages?.name||"Language")+" · "+newLevel;
                hub.querySelectorAll(".level-option").forEach(button=>{
                  button.disabled=false;
                  button.classList.toggle("active",button.dataset.level===newLevel);
                  button.textContent=button.dataset.level;
                });
                window.location.reload();
              } catch(saveError) {
                console.error("Could not save selected level:",saveError);
                alert(saveError.message||"We couldn't save that level. Please try again.");
                hub.querySelectorAll(".level-option").forEach(button=>{
                  button.disabled=false;
                  button.textContent=button.dataset.level;
                });
              }
            });
          });
        });
      } catch (error) {
        console.error("Could not load learner profile:", error);
        window.location.href = "login.html";
      }
    }

    function escapeHtml(value) {
      const div = document.createElement("div");
      div.textContent = value == null ? "" : String(value);
      return div.innerHTML;
    }
    async function startLesson() {
      sessionStorage.removeItem("nahtive_lesson_completed");
      try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) { window.location.href = "login.html"; return; }
        const savedId = localStorage.getItem("Nahtive_current_learner_language") || localStorage.getItem("native_current_learner_language");
        const { data: langs, error } = await supabaseClient
          .from("learner_languages")
          .select("id,is_current")
          .eq("user_id", user.id)
          .order("is_current", { ascending:false });
        if (error || !langs?.length) { window.location.href = "onboarding.html"; return; }
        const current = langs.find(row => row.is_current) || langs.find(row => row.id === savedId) || langs[0];
        localStorage.setItem("Nahtive_current_learner_language", current.id);
        window.location.href = "lesson.html";
      } catch (error) {
        console.error("Could not start lesson:", error);
        window.location.href = "lesson.html";
      }
    }

    function showLessonState() {
      const completed = sessionStorage.getItem("nahtive_lesson_completed") === "true";
      const lastTitle = sessionStorage.getItem("nahtive_last_lesson_title");

      const label = document.getElementById("recommendedLabel");
      const title = document.getElementById("recommendedTitle");
      const copy = document.getElementById("recommendedCopy");
      const button = document.getElementById("startLessonButton");

      if (!completed) return;

      if (label) label.textContent = "Next up";
      if (title) title.textContent = "Ready for another lesson?";
      if (copy) {
        copy.textContent = lastTitle
          ? "You just completed " + lastTitle + ". Nahtive can build you another short lesson when you're ready."
          : "You just completed a lesson. Nahtive can build you another short lesson when you're ready.";
      }
      if (button) button.innerHTML = "Start another lesson <span>→</span>";
    }

    document.getElementById("logoutButton").addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      sessionStorage.removeItem("nahtive_learning_profile");
      window.location.href = "login.html";
    });

    document.querySelectorAll("[data-add-language]").forEach(button => button.addEventListener("click", () => addLanguage(button.dataset.addLanguage, button)));

    showLessonState();

    (async () => {
      await loadLearningProfile();
    })();
