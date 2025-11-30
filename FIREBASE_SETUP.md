# SolaFire - Firebase Setup Guide

## 🚀 Quick Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it: `solafire`
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Set up Realtime Database
1. In Firebase Console, go to "Realtime Database"
2. Click "Create Database"
3. Choose location (closest to your users)
4. Start in **test mode** (we'll add security rules later)
5. Click "Enable"

### 3. Get Firebase Configuration
1. In Firebase Console, click gear icon → "Project settings"
2. Under "Your apps", click web icon (</>)
3. Register app: `solafire`
4. Copy the firebaseConfig object
5. Paste it into `lib/firebase.ts`

### 4. Update Firebase Configuration
Edit `lib/firebase.ts` and replace the placeholder config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "solafire.firebaseapp.com",
  databaseURL: "https://solafire-default-rtdb.firebaseio.com",
  projectId: "solafire",
  storageBucket: "solafire.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
}
```

### 5. Install Dependencies
```bash
npm install
```

### 6. Run the App
```bash
npm run dev
```

## 🔒 Security Rules (Important!)

Go to Realtime Database → Rules and replace with:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "globalData": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## 🎯 Features

- ✅ **Real-time collaboration** - All users see changes instantly
- ✅ **Cross-browser sync** - Works in incognito and different browsers
- ✅ **Secure authentication** - Only logged-in users can access data
- ✅ **Automatic backups** - Data stored securely in Firebase
- ✅ **Free tier** - Up to 1GB storage, perfect for your project

## 🧪 Test It

1. Open app in normal browser window
2. Create a project/user/allocation
3. Open app in incognito window
4. Login and see the same data!
5. Make changes - they sync in real-time

## 🚨 Troubleshooting

### "Permission denied" error
- Check Firebase security rules
- Make sure you're logged in

### "Network error" 
- Check your internet connection
- Verify Firebase configuration

### Data not saving
- Check browser console for errors
- Make sure Firebase project is in test mode

## 📞 Need Help?

- Check the browser console (F12) for detailed error messages
- Make sure all Firebase configuration values are correct
- Verify the database URL matches your Firebase project

🎉 **Your SolaFire app is now ready for true multi-user collaboration!**
