import type { CapacitorConfig } from '@capacitor/cli'

// App de loja (Android/iPhone) com o mesmo código do site (PLANO.md, seção 13).
const config: CapacitorConfig = {
  appId: 'app.doisoudez',
  appName: 'Dois ou Dez',
  webDir: 'dist',
  plugins: {
    // Login nativo (tela de contas do próprio celular); o Firebase do site recebe o token.
    // Apple: só no iPhone (a Apple exige o "Entrar com a Apple" quando o app tem login do Google)
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com', 'apple.com'],
    },
  },
  experimental: {
    ios: {
      spm: {
        // evita o conflito de nomes de pacote do plugin de login no Swift Package Manager
        packageOptions: { '@capacitor-firebase/authentication': { symlink: true } },
        // só o login do Google no iPhone (sem o SDK do Facebook, que o app não usa)
        swiftToolsVersion: '6.1',
        packageTraits: { '@capacitor-firebase/authentication': ['Google'] },
      },
    },
  },
}

export default config
