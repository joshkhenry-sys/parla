import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: learner } = await supabase
    .from("learner_languages")
    .select("id, level, languages(name)")
    .eq("user_id", data.user.id)
    .eq("is_current", true)
    .maybeSingle();

  if (!learner) redirect("/onboarding");

  const { data: skills } = await supabase
    .from("learner_skills")
    .select("skill, mastery")
    .eq("learner_language_id", learner.id);

  return (
    <main className="progress-page">
      <nav className="lesson-nav">
        <a href="/dashboard" className="lesson-back">← Dashboard</a>
        <a href="/" className="dynamic-logo">parla<span>•</span></a>
        <span className="dynamic-label">Progress</span>
      </nav>

      <section className="progress-shell">
        <div className="dynamic-eyebrow">Your progress</div>
        <h1>{learner.languages?.name} · {learner.level}</h1>
        <p className="progress-subtitle">See what is getting stronger and where Parla will focus next.</p>

        <div className="progress-skill-grid">
          {(skills || []).map((skill) => (
            <div className="progress-skill-card" key={skill.skill}>
              <div className="progress-skill-top">
                <span>{skill.skill}</span>
                <strong>{Math.round(Number(skill.mastery || 0))}%</strong>
              </div>
              <div className="progress-skill-track">
                <span style={{ width: `${Number(skill.mastery || 0)}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="progress-insight">
          <div className="dynamic-label">What Parla sees</div>
          <h2>Your next lessons will change as your skills change.</h2>
          <p>Vocabulary, grammar, understanding, conversation, and confidence are tracked separately so your learning path can adapt.</p>
        </div>
      </section>
    </main>
  );
}
