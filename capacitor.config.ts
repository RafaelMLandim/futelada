import type { CapacitorConfig } from '@capacitor/cli'

// App de loja (Android/iPhone) com o mesmo código do site (PLANO.md, seção 13).
const config: CapacitorConfig = {
  appId: 'app.doisoudez',
  appName: 'Dois ou Dez',
  webDir: 'dist',
  plugins: {
    // Login do Google nativo (tela de contas do próprio celular); o Firebase do site recebe o token
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
}

export default config
