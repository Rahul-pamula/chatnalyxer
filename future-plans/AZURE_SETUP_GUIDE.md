# Azure Student Account Setup & Email Integration Guide

## ✅ Step 1: Azure Student Account Setup

1. **Go to [Azure for Students](https://azure.microsoft.com/free/students/)**
2. Click **"Sign up now"** (green button).
3. Sign in with your **friend's .edu email address**.
4. Complete the phone verification (if asked).
5. **No credit card required!** You get $100 credits valid for 12 months.

---

## ✅ Step 2: Create AI Resources

Once logged into [portal.azure.com](https://portal.azure.com):

### **1. create Resource Group**
- Search **"Resource groups"** -> Create
- Name: `chatnalyxer-rg`
- Region: **`Sweden Central`** (Recommended) or `South Central US`
- Click **Review + create** -> **Create**

> [!NOTE]
> **Can't change RG region?**
> If you already created the Resource Group in India, **that's fine!** You cannot change an RG's region, but **you CAN create resources inside it that are in a different region.**
> Just select **Sweden Central** when creating the OpenAI resource below.

### **2. Create Azure OpenAI Service** (For Text & Email Analysis)
- Search **"Azure OpenAI"** -> Create
- Resource group: `chatnalyxer-rg`
- Region: **`Sweden Central`** (Use this regardless of RG region)
- Name: `chatnalyxer-openai`
- Pricing tier: `Standard S0`
- Click **Next** -> **Create**

> **Students: Azure OpenAI is very restricted.**
> If Sweden Central failed, try **East US 2**.
>
> 1. **East US 2**
> 2. **France Central**
> 3. **UK South**
>
> ---
>
> ### 🛑 PLAN B: If ALL OpenAI regions fail (Common for Students)
>
> Don't worry! We can still meet Imagine Cup rules (2 AI services) using **Azure AI Language** instead.
>
> **Create "Language Service" instead of OpenAI:**
> 1. Search **"Language service"** -> Create
> 2. Select **"Sentiment analysis and key phrase extraction"** (Keep default)
> 3. Click **Continue to create your resource**
> 4. Region: **Central India** (This usually works!)
> 5. Name: `chatnalyxer-language`
> 6. Tier: **Free F0** (or Standard S)
> 7. This counts as your 2nd AI service! ✅

**Wait for deployment, then go to resource:**
- Click **"Model deployments"** (left menu) -> Manage Deployments
- Click **"Create new deployment"**
- Select Model: `gpt-4` (or `gpt-35-turbo` to save credits)
- Deployment name: `gpt-4` (remember this!)
- **Copy Keys:** Go to "Keys and Endpoint" on left. Copy KEY 1 and ENDPOINT.

### **3. Create Azure AI Vision** (For Images)
- Search **"Computer Vision"** -> Create
- Resource group: `chatnalyxer-rg`
- Region: `East US`
- Name: `chatnalyxer-vision`
- Pricing tier: `Free F0` (Important!)
- Click **Review + create** -> **Create**
- **Copy Keys:** Go to "Keys and Endpoint". Copy KEY 1 and ENDPOINT.

### **4. Create Azure AI Speech** (For Voice Notes)
- Search **"Speech Services"** -> Create
- Resource group: `chatnalyxer-rg`
- Region: `East US`
- Name: `chatnalyxer-speech`
- Pricing tier: `Free F0`
- Click **Review + create** -> **Create**
- **Copy Keys:** Go to "Keys and Endpoint". Copy KEY 1.

---

## ✅ Step 3: Link Email (Gmail Setup)

To use Gmail integration, you need an **App Password** (Regular password won't work).

1. Go to your **Google Account** settings.
2. Select **Security**.
3. Under "Signing in to Google", turn on **2-Step Verification**.
4. Go back to Security, search for **"App Passwords"**.
5. App name: `Chatnalyxer`.
6. Click **Create**.
7. **Copy the 16-character code.** This is your "App Password".

---

## ✅ Step 4: Update Your Code

1. Rename `.env.example` to `.env` in `chatnalyxer-backend/`.
2. Paste your Azure keys:
   ```env
   AZURE_OPENAI_ENDPOINT=https://chatnalyxer-openai.openai.azure.com/
   AZURE_OPENAI_KEY=your_key_here
   AZURE_OPENAI_DEPLOYMENT=gpt-4
   
   AZURE_VISION_ENDPOINT=https://chatnalyxer-vision.cognitiveservices.azure.com/
   AZURE_VISION_KEY=your_key_here
   
   AZURE_SPEECH_KEY=your_key_here
   AZURE_SPEECH_REGION=eastus
   ```

3. **Restart Backend:**
   ```bash
   ./start_all.sh
   ```

4. **In the Mobile App:**
   - Go to Setup screen.
   - Click **Connect Email**.
   - Enter your Gmail address.
   - Enter the **16-character App Password**.
   - Click Connect!

---

**That's it!** Your app will now analyze both WhatsApp and Email using Azure AI. 🚀
