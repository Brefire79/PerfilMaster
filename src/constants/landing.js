// Contato comercial da landing page (src/pages/public/Landing.jsx).
//
// O cadastro do Perfil Master é por convite (Register exige token), então a
// landing não tem "criar conta": o CTA principal leva o visitante a falar com
// a Vianexx. Preencha um dos dois — WhatsApp tem prioridade. Vazios, o botão
// cai para /suporte (não quebra, só não converte).
//
// Formato do WhatsApp: só dígitos com DDI, ex.: '5511999999999'.
export const CONTATO_WHATSAPP = import.meta.env.VITE_CONTATO_WHATSAPP || '5511954492253';
export const CONTATO_EMAIL = import.meta.env.VITE_CONTATO_EMAIL || 'breno.luis@gmail.com';

const MENSAGEM = 'Olá! Quero conhecer o Perfil Master para aplicar avaliações DISC + Sabotadores.';

export function linkDeContato() {
  if (CONTATO_WHATSAPP) {
    return `https://wa.me/${CONTATO_WHATSAPP}?text=${encodeURIComponent(MENSAGEM)}`;
  }
  if (CONTATO_EMAIL) {
    return `mailto:${CONTATO_EMAIL}?subject=${encodeURIComponent('Demonstração do Perfil Master')}`;
  }
  return '/suporte';
}

export const CONTATO_EXTERNO = Boolean(CONTATO_WHATSAPP || CONTATO_EMAIL);
