#!/usr/bin/env python3
"""
generate_html.py
Reads core function JSON files from ./functions and outputs ./index.html
with collapsible sections: Function -> Tasks -> Deliverables.
"""
import os, json, glob, html, sys
from collections import defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
FUNCTIONS_DIR = os.path.join(BASE, "functions")
OUTPUT_HTML = os.path.join(BASE, "index.html")

def load_functions(path: str):
    items = []
    for fp in glob.glob(os.path.join(path, "**/*.json"), recursive=True):
        try:
            with open(fp, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and data.get("code") and data.get("tasks"):
                    items.append(data)
        except Exception as e:
            print(f"[WARN] Failed to parse {fp}: {e}", file=sys.stderr)
    return items

def by_phase(funcs):
    phases = defaultdict(list)
    for f in funcs:
        phases[f.get("phase","Unspecified")].append(f)
    # Sort phases in a sensible order if common names are used
    PHASE_ORDER = ["R&D","Development","Production","Post","Other","Unspecified"]
    # Anything not in PHASE_ORDER goes alphabetically after
    present = set(phases.keys())
    ordered = []
    for p in PHASE_ORDER:
        if p in phases:
            ordered.append((p, phases[p]))
    for p in sorted(present - set(PHASE_ORDER)):
        ordered.append((p, phases[p]))
    return ordered

def esc(x): return html.escape(str(x)) if x is not None else ""

def render(funcs):
    # Group
    grouped = by_phase(funcs)

    html_parts = []
    html_parts.append("""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Core Functions Viewer</title>
<style>
  :root { --bg:#0b0f16; --fg:#e6edf3; --muted:#8b949e; --card:#111827; --accent:#60a5fa; }
  body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji; margin:0; padding:0; background:var(--bg); color:var(--fg)}
  header{position:sticky; top:0; background:#0b1220cc; backdrop-filter: blur(8px); padding:16px 20px; border-bottom:1px solid #111827}
  h1{margin:0; font-size:20px}
  .container{max-width:1100px; margin:24px auto; padding:0 20px}
  .search{display:flex; gap:10px; margin-bottom:16px}
  .search input{flex:1; padding:10px 12px; border-radius:8px; border:1px solid #1f2937; background:#0f172a; color:var(--fg)}
  .pill{font-size:12px; color:var(--muted); padding:2px 8px; border:1px solid #223045; border-radius:999px; margin-left:8px}
  details{background:var(--card); border:1px solid #1f2937; border-radius:12px; padding:8px 12px; margin:10px 0}
  summary{cursor:pointer; font-weight:600; outline:none}
  .meta{color:var(--muted); font-size:12px; margin-left:8px}
  .task, .deliverable{border:1px dashed #263349; padding:8px 10px; border-radius:10px; margin:8px 0; background:#0b1220}
  .grid{display:grid; grid-template-columns: 1fr auto; gap:8px}
  .muted{color:var(--muted)}
  a{color:var(--accent); text-decoration:none}
  a:hover{text-decoration:underline}
  .phase{font-size:18px; margin:24px 0 12px; color:#cbd5e1}
  .badge{padding:2px 6px; border-radius:6px; background:#0b1220; border:1px solid #1f2937; font-size:12px; margin-left:8px}
  .footer{color:var(--muted); font-size:12px; margin-top:24px}
  .acceptance{margin:6px 0 0 0; padding-left:18px}
</style>
</head>
<body>
<header>
  <h1>Core Functions Viewer <span class="pill" id="count"></span></h1>
</header>
<div class="container">
  <div class="search">
    <input id="q" placeholder="Filter by code, title, task, deliverable, phase, or category… (e.g., E2, storyboard, R&D)" />
  </div>
""")

    total_functions = 0
    for phase, items in grouped:
        # Sort functions by code
        items = sorted(items, key=lambda x: (str(x.get("code")), str(x.get("title",""))))
        html_parts.append(f'<div class="phase">{esc(phase)}</div>')
        for f in items:
            total_functions += 1
            code = f.get("code","")
            title = f.get("title") or f.get("name") or ""
            category = f.get("category","")
            purpose = f.get("purpose","")
            tasks = f.get("tasks") or []

            html_parts.append('<details class="function" data-filter="%s">' % esc(" ".join([str(code), phase, category, title, purpose])))
            html_parts.append('<summary><span>%s — %s</span><span class="meta">[%s] <span class="badge">%s</span></span></summary>' % (esc(code), esc(title), esc(category or "uncat"), esc(phase)))

            if purpose:
                html_parts.append('<div class="muted" style="margin:6px 0 8px 2px;">%s</div>' % esc(purpose))

            # Tasks
            for t in tasks:
                t_id = t.get("id","")
                t_title = t.get("title","")
                t_desc = t.get("description","")
                dels = t.get("deliverables") or []

                html_parts.append('<details class="task" data-filter="%s">' % esc(" ".join([t_id, t_title, t_desc])))
                html_parts.append('<summary>%s — %s</summary>' % (esc(t_id), esc(t_title)))
                if t_desc:
                    html_parts.append('<div class="muted" style="margin:6px 0 6px 2px;">%s</div>' % esc(t_desc))

                # Deliverables
                for d in dels:
                    d_id = d.get("id","")
                    fn = d.get("filename","")
                    d_desc = d.get("description","")
                    path_hint = d.get("path_hint","")
                    filetype = d.get("filetype","")
                    aliases = d.get("aliases") or []
                    acceptance = d.get("acceptance") or []
                    html_parts.append('<details class="deliverable" data-filter="%s">' % esc(" ".join([d_id, fn, d_desc, path_hint, filetype])))
                    html_parts.append('<summary>%s — %s <span class="meta">%s</span></summary>' % (esc(d_id), esc(fn or "[no filename]"), esc(filetype or "")))
                    if d_desc:
                        html_parts.append('<div class="muted" style="margin:6px 0 6px 2px;">%s</div>' % esc(d_desc))
                    if acceptance:
                        html_parts.append('<div class="muted">Acceptance Criteria:</div>')
                        html_parts.append('<ul class="acceptance">')
                        for ac in acceptance:
                            ac_id = ac.get("id","")
                            ac_txt = ac.get("text","")
                            html_parts.append('<li><strong>%s</strong> — %s</li>' % (esc(ac_id), esc(ac_txt)))
                        html_parts.append('</ul>')
                    html_parts.append('</details>')  # deliverable

                html_parts.append('</details>')  # task

            html_parts.append('</details>')  # function

    html_parts.append(f"""
  <div class="footer">Generated from {len(funcs)} function file(s).</div>
</div>
<script>
  const q = document.getElementById('q');
  const cnt = document.getElementById('count');
  const nodes = Array.from(document.querySelectorAll('details.function'));
  function filter() {{
    const s = q.value.trim().toLowerCase();
    let visible = 0;
    for (const f of nodes) {{
      const hay = (f.getAttribute('data-filter')||'').toLowerCase();
      // inside text too
      const inner = f.innerText.toLowerCase();
      const show = !s || hay.includes(s) || inner.includes(s);
      f.style.display = show ? '' : 'none';
      if (show) visible++;
    }}
    cnt.textContent = visible + " functions";
  }}
  q.addEventListener('input', filter);
  filter();
</script>
</body>
</html>""")

    return "\n".join(html_parts)

def main():
    funcs = load_functions(FUNCTIONS_DIR)
    html_out = render(funcs)
    with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
        f.write(html_out)
    print(f"Wrote: {{OUTPUT_HTML}} ({{len(funcs)}} functions)")

if __name__ == "__main__":
    main()
