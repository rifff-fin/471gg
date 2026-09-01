export default async function run(page, ui) {
  const token = await page.evaluate(() => localStorage.getItem("token"));
  const me = await page.evaluate(async (t) => {
    const r = await fetch("http://localhost:1141/api/auth/me", {
      headers: { Authorization: "Bearer " + t },
    });
    return await r.json();
  }, token);
  await page.goto("http://localhost:5173/admin-dashboard");
  await page.waitForTimeout(2500);
  const snap = await ui.snapshot();
  return {
    role: me?.data?.role ?? me,
    url: page.url(),
    snap: snap.slice(0, 1800),
  };
}
