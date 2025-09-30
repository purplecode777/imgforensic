node --version
npm --version
npx create-react-app image-forensic-tool
cd image-forensic-tool
npm install lucide-react
npm start
 Troubleshooting
If you get errors:

Clear cache and reinstall:

bash   rm -rf node_modules package-lock.json
   npm install

If port 3000 is busy:

bash   npm start -- --port 3001

Permission errors on Windows:

Run Command Prompt/PowerShell as Administrator
