$ErrorActionPreference = 'Stop'

$repo = 'https://github.com/seafeetstarken/acessordigital-v1.git'
$token = & 'C:\Program Files\GitHub CLI\gh.exe' auth token

git remote set-url origin ("https://x-access-token:{0}@github.com/seafeetstarken/acessordigital-v1.git" -f $token)
git push origin main
git remote set-url origin $repo
