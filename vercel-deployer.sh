#!/bin/sh
# Étape « Ignored Build Step » de Vercel (vercel.json → ignoreCommand), copiée de DossierBC.
# Code 0 : pas de déploiement. Code 1 : déploiement. Un commit qui ne touche que l’outillage
# (scripts, scrapers, workflows, notes) ne redéploie pas. Si git ne trouve pas le dernier commit
# déployé (clone partiel de Vercel), il échoue et on déploie par prudence : c’est ce qui bloquait
# tous les déploiements depuis le 16 nov. 2026 (« fatal: bad object »).
# À la racine, et pas dans /scripts, parce que .vercelignore retire /scripts avant cette étape.

git diff --quiet "${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}" HEAD -- . \
  ':(exclude,glob)**/*.md' \
  ':(exclude,glob)scrapers/**' \
  ':(exclude,glob)scripts/**' \
  ':(exclude,glob).github/**' || exit 1
