const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

async function test() {
  try {
    const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
            system_instruction: { parts: [{ text: "You are a tutor" }] },
            contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
        }
    );
    console.log(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
test();
