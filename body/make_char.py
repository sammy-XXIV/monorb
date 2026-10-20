# python -I make_char.py : walk.html + traits_patch.js -> char.html
v = open("walk.html", encoding="utf8").read()
def rep(a, b):
    global v
    assert a in v, a
    v = v.replace(a, b, 1)
rep("<title>Chog Walk 3D</title>", "<title>Chog Traits 3D</title>")
rep("STEP 5 · WALK (JOINTS)</b><br><span id=\"st\">loading…</span><br>",
    "STEP 6 · TRAITS</b><br><span id=\"st\">loading…</span><br>Token # <input id=\"tok\" type=\"number\" min=\"1\" max=\"1969\" value=\"1462\" style=\"width:70px;font:inherit\"> <button id=\"rnd\">Random</button><div id=\"tl\" style=\"margin-top:6px;line-height:1.5;max-width:260px\"></div>")
rep("  meshes.forEach(m => {\n", "  meshes.forEach(m => {\n    m.userData.kind = file.includes(\"hair\") ? \"hair\" : file.includes(\"body\") ? m.name.replace(/_.*/, \"\") : \"face\";\n")
rep("if (++n === 3) rig();", "if (++n === 3) { rig(); loadTraits(); }")
rep('addEventListener("resize", resize); resize();', 'addEventListener("resize", resize); resize();\n' + open("traits_patch.js", encoding="utf8").read())
open("char.html", "w", encoding="utf8").write(v)
print("char.html written")
