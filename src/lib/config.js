// Otis Hub configuration.
// This Firebase project + Cloudinary account are shared with other apps, so
// everything Otis Hub writes is isolated three ways:
//   1. All data lives under its own Realtime Database node: /otishub/...
//      (other apps, e.g. /pos, never read it, and this site never reads theirs)
//   2. Every record also carries site: "otis-hub" and is filtered on read
//   3. Cloudinary uploads go to the "otis-hub/" folder and are tagged "otis-hub"
//
// The Firebase web config below is not a secret: browser apps always ship it.
// Access is controlled by the database rules, not by hiding these values.

export const firebaseConfig = {
  apiKey: "AIzaSyAUYAB6G3ZW9F-KWgsMLQeUc2SPaw8h93M",
  authDomain: "posjl-b49ce.firebaseapp.com",
  databaseURL: "https://posjl-b49ce-default-rtdb.firebaseio.com",
  projectId: "posjl-b49ce",
  storageBucket: "posjl-b49ce.firebasestorage.app",
  messagingSenderId: "624369028287",
  appId: "1:624369028287:web:d650c36385899f26490a0a"
};

export const SITE_ID = "otis-hub";
export const SITE_NAME = "Otis Hub";

// SHA-256 of the admin password. Only the hash is stored, never the password.
// To change the password, run:
//   node -e "console.log(require('crypto').createHash('sha256').update('NEW-PASSWORD').digest('hex'))"
// and paste the result here.
export const ADMIN_PASS_SHA256 = "4ff3f06952cb264b23597ed0588a987ee6ec221de8dcc3ba46b4157efff84955";

export const DB_ROOT = "otishub";   // -> /otishub/products, /otishub/categories

export const CLOUDINARY = {
  cloud: "dwlasndqv",
  preset: "quranpilot",
  folder: "otis-hub/products",
  tag: "otis-hub"
};

// International format, no "+" or leading 0  (0769212618 -> 254769212618)
export const WHATSAPP = "254769212618";
export const WHATSAPP_DISPLAY = "0769 212 618";
export const CURRENCY = "KES";
