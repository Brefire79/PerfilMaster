// ============================================================================
// Central de Gestão — Módulo 4: geração de PDF LOCAL a partir do JSON agregado.
// A IA só escreve a narrativa; o PDF é montado aqui (custo previsível, sem PII).
// jsPDF v4 + jspdf-autotable v5 (API funcional: autoTable(doc, {...})).
// ============================================================================
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const ROXO = [99, 102, 241];   // #6366F1
const CINZA = [110, 111, 128];

const DISC_NOMES = { D: 'Dominante', I: 'Influente', S: 'Estável', C: 'Analítico' };

function cabecalho(doc) {
  doc.setFillColor(...ROXO);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Central de Gestão · Perfil Master', 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Vianexx AI', doc.internal.pageSize.getWidth() - 14, 12, { align: 'right' });
}

function rodape(doc) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...CINZA);
    const data = new Date().toLocaleString('pt-BR');
    doc.text(`Gerado em ${data}`, 14, doc.internal.pageSize.getHeight() - 8);
    doc.text(`${i}/${n}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
  }
}

/**
 * gerarPdfCentral — monta e baixa o PDF da resposta do Assistente.
 * @param {{ pergunta:string, narrativa:string, dados:object, queryUsada:string }} resp
 */
export function gerarPdfCentral({ pergunta, narrativa, dados, queryUsada }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const larg = doc.internal.pageSize.getWidth();
  cabecalho(doc);

  let y = 28;
  doc.setTextColor(20, 20, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Análise da Central de Gestão', 14, y);
  y += 8;

  // Pergunta
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(...CINZA);
  const pPergunta = doc.splitTextToSize(`Pergunta: ${pergunta || '—'}`, larg - 28);
  doc.text(pPergunta, 14, y);
  y += pPergunta.length * 5 + 4;

  // Narrativa
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 40);
  const pNarr = doc.splitTextToSize(narrativa || '—', larg - 28);
  doc.text(pNarr, 14, y);
  y += pNarr.length * 5.5 + 6;

  // Tabela de dados agregados
  if (queryUsada === 'inteligencia_grupos' && Array.isArray(dados?.grupos)) {
    autoTable(doc, {
      startY: y,
      head: [['Grupo', 'Part.', 'Concl.', 'Taxa', 'D/I/S/C (médias)']],
      body: dados.grupos.map((g) => {
        const m = g.medias_disc || {};
        return [
          g.grupo || '—',
          String(g.participantes ?? '—'),
          String(g.concluidas ?? '—'),
          `${g.taxa_conclusao ?? 0}%`,
          `${m.D ?? '-'}/${m.I ?? '-'}/${m.S ?? '-'}/${m.C ?? '-'}`,
        ];
      }),
      headStyles: { fillColor: ROXO },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    if (dados.grupos_suprimidos > 0) {
      const fy = doc.lastAutoTable.finalY + 6;
      doc.setFontSize(9);
      doc.setTextColor(...CINZA);
      doc.text(`${dados.grupos_suprimidos} grupo(s) ocultado(s) por k-anonimato (< ${dados.min_n}).`, 14, fy);
    }
  } else if (queryUsada === 'visao_geral' && dados) {
    autoTable(doc, {
      startY: y,
      head: [['Métrica', 'Valor']],
      body: [
        ['Janela (dias)', dados.janela_dias ?? 'tudo'],
        ['Criadas', dados.criadas ?? 0],
        ['Iniciadas', dados.iniciadas ?? 0],
        ['Concluídas', dados.concluidas ?? 0],
        ['Taxa de conclusão', `${dados.taxa_conclusao ?? 0}%`],
        ['Tempo médio (min)', dados.tempo_medio_min ?? '—'],
      ].map((r) => r.map(String)),
      headStyles: { fillColor: ROXO },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
  }

  rodape(doc);
  const nome = `central-${queryUsada || 'analise'}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nome);
}

export { DISC_NOMES };
