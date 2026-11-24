import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// API는 client/src/api.js 의 VITE_API_URL 을 사용합니다.
// (로컬: http://localhost:5000, 배포: Heroku URL)
export default defineConfig({
  plugins: [react()],
})
