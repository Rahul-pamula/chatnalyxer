<<for killing working process>>

pkill -f uvicorn && pkill -f npm && pkill -f node

<<restart backend and app>>

./start_all.sh

<The "Protocol error (Runtime.callFunctionOn): Execution context was destroyed" error in WhatsApp Web.js occurs due to browser session instability. Here's why it happens and how to solve it manually:>

cd whatsapp-integration
npm update

Restart integration: Stop and restart the WhatsApp integration from your app
