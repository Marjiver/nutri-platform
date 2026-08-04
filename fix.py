with open('login.html','r',encoding='utf-8',errors='replace') as f:
    content = f.read()

content = content.replace(
    "let MODE_SUPA = false;",
    "if(typeof MODE_SUPA === 'undefined') var MODE_SUPA = false;"
)

with open('login.html','w',encoding='utf-8') as f:
    f.write(content)
print("OK")
