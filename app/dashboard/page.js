import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect("/login");
  }

  const { data: learner } = await supabase
    .from("learner_languages")
    .select("id, level, goal, interests, languages(name, code)")
    .eq("user_id", user.id)
    .eq("is_current", true)
    .maybeSingle();

  if (!learner) {
    redirect("/onboarding");
  }

  const { data: skills } = await supabase
    .from("learner_skills")
    .select("skill, mastery")
    .eq("learner_language_id", learner.id);

  const averageMastery =
    skills && skills.length
      ? Math.round(
          skills.reduce((sum, item) => sum + Number(item.mastery || 0), 0) /
            skills.length
        )
      : 0;

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Learner";

  const language = learner.languages?.name || "Your language";

  return (
    <main className="dynamic-dashboard">
      <nav className="dynamic-nav">
        <a href="/" className="dynamic-logo">parla<span>•</span></a>
        <div className="dynamic-user">
          <span>{displayName}</span>
          <a href="/onboarding">Learning settings</a>
        </div>
      </nav>

      <section className="dynamic-hero">
        <div className="dynamic-eyebrow">Your learning</div>
        <h1>Keep going, {displayName.split(" ")[0]}.</h1>
        <p>
          Parla is learning how you learn. Your path is built from what you know,
          what you practice, and what you need next.
        </p>
      </section>

      <section className="dynamic-grid">
        <article className="dynamic-card">
          <div className="dynamic-label">Current language</div>
          <div className="dynamic-language-row">
            <strong>{language}</strong>
            <span className="dynamic-level">{learner.level}</span>
          </div>

          <div className="dynamic-percent">{averageMastery}%</div>
          <div className="dynamic-muted">current skill mastery</div>

          <div className="dynamic-progress">
            <span style={{ width: `${averageMastery}%` }} />
          </div>

          <div className="dynamic-footer">
            <span>{learner.goal || "Keep building"}</span>
            <span>{averageMastery} / 100</span>
          </div>
        </article>

        <article className="dynamic-card dynamic-dark">
          <div className="dynamic-label">What&apos;s next</div>
          <h2>Build language you can actually use.</h2>
          <p>
            Lessons will adapt to your level, interests, mistakes, and conversations.
          </p>
          <a href="/lesson" className="dynamic-button">Start a lesson →</a>
        </article>
      </section>

      <section className="dynamic-section">
        <div className="dynamic-label">Your skills</div>
        <div className="skill-list">
          {(skills || []).map((skill) => (
            <div className="skill-row" key={skill.skill}>
              <span>{skill.skill}</span>
              <div className="skill-track">
                <span style={{ width: `${Number(skill.mastery || 0)}%` }} />
              </div>
              <strong>{Math.round(Number(skill.mastery || 0))}%</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
