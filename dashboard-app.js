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

  // Sort by curriculum order. Level filtering is already handled by levelMatches above.
  usable.sort((a, b) => Number(a.sequence_number || 0) - Number(b.sequence_number || 0));

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

// PLACEHOLDER - full file continues with loadSavedLessons, loadLearningProfile, startLesson, etc.
// This incomplete upload will be replaced.
console.error("dashboard-app.js is incomplete - restore from commit cd78d994");
