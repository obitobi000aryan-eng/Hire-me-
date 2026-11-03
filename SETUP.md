# WorkSphere — setup guide

WorkSphere is a responsive freelance marketplace starter built with HTML, CSS, JavaScript modules and Firebase Authentication + Cloud Firestore.

## Included in this project

- Responsive landing page and mobile layout
- Email/password signup and login
- Freelancer, client, or both account roles
- Public freelancer directory with skill search
- Public project board with category and keyword filters
- Client project posting
- Freelancer project applications
- Service listings
- Personal dashboard for projects, applications, services and profile
- Firestore security rules

## Important status

This is a functional starter/MVP, not a finished commercial marketplace. It does **not** include escrow, payment processing, payouts, dispute resolution, verified reviews, private chat, file delivery, moderation tools, or admin console. Do not collect real client payments or promise escrow until those systems are built and reviewed.

## 1. Create Firebase project

1. Open https://console.firebase.google.com/ and sign in.
2. Create a project named `worksphere` (or another project ID).
3. In Project settings, add a Web app (`</>`).
4. Copy the Firebase web configuration.
5. In this project folder, duplicate `firebase-config.example.js` and rename the copy to `firebase-config.js`.
6. Replace the placeholder values in `firebase-config.js` with your web app configuration.
7. Enable **Authentication → Sign-in method → Email/Password**.
8. Create **Firestore Database** (start in production mode).

Firebase web config is intended to be present in frontend code. Never put service-account JSON, private keys, or admin credentials in this folder or in a public repository.

## 2. Publish Firestore rules

1. Open Firestore Database → Rules.
2. Replace the starter rules with the contents of `firestore.rules`.
3. Click Publish.

These rules are a starting point and should be tested and reviewed before a public launch. Public profile, job and service reads are enabled so visitors can browse listings. Do not store private phone numbers, home addresses, passwords, payment data or identity documents in public profile fields.

## 3. Run locally

Because this project uses JavaScript modules, open it through a local web server rather than opening `index.html` as a file.

Options:
- Use VS Code with the Live Server extension on a computer.
- On Android, use a trusted code editor/preview app that can serve a local folder over HTTP.
- Or deploy the folder to GitHub Pages after adding `firebase-config.js` (remember that GitHub Pages is public hosting).

## 4. Deploy with GitHub Pages

1. Create a GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js`, `firebase-config.js` and the other project files.
3. Open repository Settings → Pages.
4. Choose deploy from the `main` branch and `/ (root)`.
5. Save and wait for the published URL.

If the repository is public, `firebase-config.js` is visible to everyone. That is normal for Firebase client config, but your Firestore security rules must be correct. Never upload service-account keys.

## 5. Test the marketplace

Use two separate test accounts:
- Account 1: choose “Hire people for projects”, then post a project.
- Account 2: choose “Find freelance work”, open Find Work and apply.
- Add a service from a freelancer account.
- Edit the profile and add skills and a portfolio URL.

## 6. Before a real launch

Add and test:
- Private in-app messaging with strict per-conversation access rules
- Client ability to review and accept/reject applications
- Project milestones and completion workflow
- Safe file upload and delivery
- Reporting, blocking, moderation and abuse prevention
- Verified ratings that can only be left after completed work
- Payment provider integration, refunds and dispute handling
- Privacy policy, terms, data deletion and support contact
- Backups, monitoring and security review

Since the developer is under 18, a parent or guardian should handle any business registration, contracts, payment-provider account and financial arrangements. Start with demo data and test accounts.

## Troubleshooting

- **“Connect Firebase first”**: create `firebase-config.js` from the example and paste your Firebase web config.
- **Login does not work**: enable Email/Password in Firebase Authentication.
- **Listings do not load**: publish `firestore.rules`, check the project ID and browser console.
- **Module/CORS errors**: serve the folder over HTTP; don't open the HTML as `file://`.
