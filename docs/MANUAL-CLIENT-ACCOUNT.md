# Création manuelle d’un compte client MaquisApp

## Objectif

Cette procédure permet à un administrateur MaquisApp de créer ponctuellement un compte client sans passer par l’OTP SMS Twilio.

Elle est utile notamment lorsque :

* Twilio est temporairement indisponible ;
* le crédit SMS Twilio est épuisé ;
* un client distant doit être créé manuellement par l’administrateur.

Cette procédure ne remplace pas le parcours normal d’inscription de MaquisApp.

Elle constitue uniquement un outil administratif de secours.

## Décision retenue

Pour le besoin ponctuel rencontré en août 2026, il a été décidé de **ne pas désactiver Twilio dans l’application**.

Les premières expérimentations visant à introduire un feature flag `SMS_OTP_ENABLED` dans `verify-otp` ont été entièrement annulées avant déploiement.

Le fichier :

`supabase/functions/verify-otp/index.ts`

est donc resté identique à sa version d’origine.

Aucune modification de configuration Supabase, Vercel ou Twilio n’a été nécessaire.

## Principe de la création manuelle

Le script administratif :

`scripts/create-client-account.cjs`

reproduit le résultat final d’une inscription normale sans utiliser Twilio.

Il effectue les opérations suivantes :

1. vérification des données fournies ;
2. vérification qu’aucun profil n’existe déjà avec le même téléphone ;
3. création de l’utilisateur dans Supabase Auth ;
4. confirmation administrative du téléphone ;
5. création du restaurant ;
6. génération d’un hash bcrypt du PIN ;
7. création du profil `gerant` ;
8. initialisation des compteurs de sécurité du PIN ;
9. rollback des objets déjà créés si une étape échoue.

Après création, le client utilise le parcours normal :

Téléphone → PIN → `login-with-pin` → Dashboard

Le client peut ensuite modifier son PIN depuis MaquisApp selon les fonctionnalités existantes.

## Fichiers ajoutés ou modifiés

### Script administratif

`scripts/create-client-account.cjs`

Ce script est destiné uniquement aux opérations administratives ponctuelles.

### Dépendance bcrypt

Le package :

`bcryptjs`

est ajouté aux `devDependencies`.

Il permet au script administratif de produire un hash bcrypt compatible avec le système PIN existant de MaquisApp.

Les fichiers concernés sont :

* `package.json`
* `package-lock.json`

## Fonctions qui ne sont pas modifiées

La procédure ne modifie pas :

* `supabase/functions/send-otp/index.ts`
* `supabase/functions/verify-otp/index.ts`
* `supabase/functions/login-with-pin/index.ts`
* `supabase/functions/set-pin/index.ts`
* `supabase/functions/unlock-pin-with-otp/index.ts`

Elle ne modifie pas non plus :

* Google Auth ;
* le frontend d’inscription ;
* les variables Vercel ;
* les secrets Supabase ;
* la configuration Twilio.

## Comportement OTP après cette modification

Aucun OTP n’est désactivé.

Le fonctionnement normal reste donc :

### Inscription normale

Téléphone → OTP Twilio → informations restaurant → PIN → Dashboard

### Connexion d’un utilisateur existant

Téléphone → PIN → `login-with-pin` → Dashboard

### Reset ou déverrouillage du PIN

Téléphone → OTP Twilio → nouveau PIN

### Google Auth

Inchangé.

## Variables utilisées par le script

Le script lit les valeurs suivantes depuis les variables d’environnement du terminal :

* `SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`
* `CLIENT_PHONE`
* `CLIENT_INDICATIF`
* `CLIENT_PIN`
* `CLIENT_NOM`
* `CLIENT_PRENOM`
* `CLIENT_VILLE`
* `CLIENT_RESTAURANT_NOM`

Valeurs par défaut prévues par le script :

* `CLIENT_INDICATIF=+225`
* `CLIENT_PRENOM=''`
* `CLIENT_VILLE=Abidjan`

Aucune information client n’est stockée directement dans le script.

## Sécurité de la Service Role

`SUPABASE_SERVICE_ROLE_KEY` est une clé administrative sensible.

Elle permet de contourner les règles RLS et ne doit jamais :

* être écrite dans le script ;
* être commitée dans Git ;
* être ajoutée à une variable `NEXT_PUBLIC_*` ;
* être exposée dans le navigateur ;
* être envoyée dans une conversation ou un ticket ;
* être laissée dans un fichier public.

Pour une opération ponctuelle, elle doit être chargée uniquement dans la session terminal :

```bash
read -rsp "Colle la SUPABASE_SERVICE_ROLE_KEY puis Entrée : " SUPABASE_SERVICE_ROLE_KEY
export SUPABASE_SERVICE_ROLE_KEY
echo
```

La valeur n’est pas affichée pendant la saisie.

Elle disparaît lorsque la session terminal est fermée.

## Sécurité du PIN

Le PIN ne doit pas être écrit directement dans le script.

Le charger temporairement avec :

```bash
read -rsp "PIN temporaire du client : " CLIENT_PIN
export CLIENT_PIN
echo
```

Le script ne réaffiche volontairement pas le PIN après la création.

Un PIN temporaire communiqué au client doit idéalement être modifié par celui-ci après sa première connexion.

## Procédure de création d’un nouveau client

### 1. Charger l’URL Supabase

```bash
export SUPABASE_URL="https://PROJECT_REF.supabase.co"
```

Utiliser l’URL réelle du projet MaquisApp.

## 2. Charger la Service Role

```bash
read -rsp "Colle la SUPABASE_SERVICE_ROLE_KEY puis Entrée : " SUPABASE_SERVICE_ROLE_KEY
export SUPABASE_SERVICE_ROLE_KEY
echo
```

Ne jamais afficher ou copier la clé dans les logs.

## 3. Charger les informations du client

Exemple :

```bash
export CLIENT_PHONE="XXXXXXXXXX"
export CLIENT_INDICATIF="+225"
export CLIENT_NOM="NOM"
export CLIENT_PRENOM="PRENOM"
export CLIENT_VILLE="Abidjan"
export CLIENT_RESTAURANT_NOM="Nom du restaurant"
```

## 4. Charger le PIN temporaire

```bash
read -rsp "PIN temporaire du client : " CLIENT_PIN
export CLIENT_PIN
echo
```

## 5. Vérifier que toutes les variables existent

```bash
node -e "const e=process.env; const req=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','CLIENT_PHONE','CLIENT_INDICATIF','CLIENT_PIN','CLIENT_NOM','CLIENT_PRENOM','CLIENT_VILLE','CLIENT_RESTAURANT_NOM']; console.log(req.map(k=>k+': '+(e[k]?'OK':'MANQUANT')).join('\n'))"
```

Toutes les variables doivent afficher :

`OK`

avant de continuer.

## 6. Créer le compte

```bash
node scripts/create-client-account.cjs
```

En cas de succès, le script affiche les étapes :

* création utilisateur Supabase Auth ;
* création restaurant ;
* création profil et PIN ;
* fin de l’opération.

Il affiche également :

* `userId`
* `restaurantId`

Le PIN n’est jamais réaffiché.

## Protection contre les doublons

Avant toute création, le script recherche un profil correspondant au numéro de téléphone.

Si un profil existe déjà avec ce téléphone, le script s’arrête.

Il ne doit pas être utilisé pour modifier ou recréer un utilisateur existant.

Pour un utilisateur existant, utiliser les mécanismes normaux de MaquisApp.

## Rollback

Si une erreur survient après la création de l’utilisateur Supabase Auth, le script tente de supprimer les objets créés pendant l’opération.

Selon l’étape atteinte, il peut supprimer :

* le restaurant nouvellement créé ;
* l’utilisateur Supabase Auth nouvellement créé.

L’objectif est d’éviter de laisser un compte partiellement créé.

## Vérification après création

Après la création administrative :

1. vérifier que le profil existe ;
2. vérifier le téléphone ;
3. vérifier le restaurant associé ;
4. vérifier le rôle `gerant` ;
5. vérifier que `pin_attempts` vaut `0` ;
6. vérifier que `pin_locked_until` vaut `null` ;
7. effectuer une connexion réelle depuis MaquisApp ;
8. utiliser le téléphone et le PIN temporaire ;
9. confirmer l’accès au dashboard.

Le test réel depuis l’application est la validation fonctionnelle finale.

## Compte pilote validé

La procédure a été utilisée avec succès en production le 13 août 2026.

Le compte a été créé avec succès dans :

* Supabase Auth ;
* `public.restaurants` ;
* `public.profiles`.

La connexion réelle Téléphone + PIN depuis MaquisApp a ensuite été testée avec succès.

Les données personnelles et le PIN de ce client ne sont volontairement pas documentés dans ce fichier.

## Créations futures

Il n’est pas nécessaire de modifier ou de recréer le script pour chaque nouveau client.

Pour une prochaine création manuelle, il suffit de fournir :

* téléphone ;
* PIN temporaire ;
* nom ;
* prénom ;
* nom du restaurant ;
* ville.

Puis charger ces nouvelles valeurs dans les variables d’environnement et exécuter :

```bash
node scripts/create-client-account.cjs
```

## Retour au fonctionnement normal

Aucune désactivation de Twilio n’est effectuée par cette procédure.

Il n’y a donc aucune opération particulière de réactivation à effectuer.

Lorsque Twilio dispose de nouveau de crédit et fonctionne normalement, le parcours OTP de MaquisApp continue à fonctionner comme auparavant.

## Règle générale

La création manuelle doit rester une procédure exceptionnelle et administrative.

Le parcours d’inscription OTP normal reste le mécanisme standard pour les créations de comptes effectuées directement par les clients.
