// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Import.module.scss';

// Imports das suas APIs
import { getCategories } from '../../../api/categories'; 
import { getRecurrences } from '../../../api/recurrences'; 
import { createBatchTransactions } from '../../../api/transactions';

export default function ImportPage() {
  const [step, setStep] = useState('UPLOAD');
  const [loading, setLoading] = useState(false);
  
  // Dados do BD
  const [categories, setCategories] = useState([]);
  const [recurrences, setRecurrences] = useState([]);

  // Dados da Tabela
  const [rows, setRows] = useState([]);

  const [extractedBalance, setExtractedBalance] = useState(null);
  const [shouldUpdateBalance, setShouldUpdateBalance] = useState(true);

  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === rows.length) {
      setSelectedIds([]); // Desmarca tudo
    } else {
      setSelectedIds(rows.map(r => r.id)); // Marca tudo
    }
  };

  const handleBulkUpdate = (field, value) => {
    if (!confirm(`Deseja aplicar esta alteração em ${selectedIds.length} itens?`)) return;

    setRows(prev => prev.map(r => {
      if (selectedIds.includes(r.id)) {
        // Se estiver mudando recorrência, limpa se o valor for vazio
        if (field === 'existingRecurrenceId' && value === "") {
             return { ...r, [field]: "" };
        }
        return { ...r, [field]: value };
      }
      return r;
    }));
    
    // Opcional: Limpar seleção após aplicar
    // setSelectedIds([]); 
  };

  // Ação em massa para Ignorar/Recuperar
  const handleBulkIgnore = (shouldIgnore) => {
    setRows(prev => prev.map(r => {
      if (selectedIds.includes(r.id)) {
        return { ...r, ignore: shouldIgnore };
      }
      return r;
    }));
  };

  // 1. Carregar dados auxiliares
  useEffect(() => {
    async function loadData() {
      try {
        const [cats, recs] = await Promise.all([
            getCategories(), 
            getRecurrences()
        ]);
        setCategories(cats);
        setRecurrences(recs);
      } catch (error) {
        console.error("Erro ao carregar categorias/recorrências", error);
      }
    }
    loadData();
  }, []);

  // 2. Parser do PDF (Lógica Visual Melhorada)
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const pdfjsLib = await import('pdfjs-dist/build/pdf');
      
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(buffer).promise;
      
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // --- NOVA LÓGICA DE EXTRAÇÃO ---
        // Agrupa itens pela posição Y (altura da linha)
        const rowsMap = new Map();
        
        textContent.items.forEach((item) => {
          // Arredondamos o Y porque as vezes varia decimal (ex: 100.1 e 100.2)
          // transform[5] é a coordenada Y no PDF
          const y = Math.round(item.transform[5]); 
          
          if (!rowsMap.has(y)) {
            rowsMap.set(y, []);
          }
          rowsMap.get(y).push(item);
        });

        // Ordena as linhas de cima para baixo (Y maior fica em cima no PDF)
        const sortedY = Array.from(rowsMap.keys()).sort((a, b) => b - a);

        sortedY.forEach((y) => {
          // Pega os itens dessa linha e ordena da esquerda para a direita (X)
          // transform[4] é a coordenada X
          const lineItems = rowsMap.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
          
          // Junta com espaço para garantir separação entre Data, Descrição e Valor
          const lineString = lineItems.map(item => item.str).join(' ');
          fullText += lineString + '\n';
        });
      }
      // console.log('Texto Extraído:', fullText); // Útil para debug
      parseTextToRows(fullText);
      extractBalance(fullText);
      setStep('REVIEW');
    } catch (err) {
      alert('Erro ao ler o arquivo PDF.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // NOVA FUNÇÃO DE EXTRAÇÃO DE SALDO
  const extractBalance = (text) => {
    // Procura por "saldo em conta" seguido de qualquer coisa até achar "R$" e o número
    // O [\s\S]*? permite pular linhas (já que o valor costuma estar na linha de baixo)
    const regex = /saldo em conta[\s\S]*?R\$\s*([\d\.]+,?\d{0,2})/i;
    const match = regex.exec(text);

    if (match) {
      const cleanVal = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
      setExtractedBalance(cleanVal);
    } else {
      setExtractedBalance(null);
    }
  };

  // 3. Lógica de Regex Ajustada (Correção para espaços e coluna de saldo)
  const parseTextToRows = (text) => {
    // Explicando a nova Regex:
    // ^\s* -> Início da linha + ignorar espaços em branco iniciais
    // (\d{2}\/\d{2}\/\d{4}) -> Data (dd/mm/aaaa)
    // \s+            -> Espaço separador
    // (.+?)          -> Descrição (pega tudo até encontrar o padrão de valor numérico)
    // \s+            -> Espaço antes do valor
    // (-?[\d\.]*,\d{2}) -> Valor da transação (pode ser negativo, ter pontos e termina com ,xx)
    // O restante da linha (saldo) é ignorado pelo regex
    const regex = /^\s*(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?[\d\.]*,\d{2})/gm;
    
    const newRows = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      const [_, dateRaw, descRaw, valRaw] = match;
      const cleanDesc = descRaw.trim();

      // Ignora linhas que são apenas informativos de saldo diário
      // O "SALDO DO DIA" aparece como descrição nessas linhas
      if (cleanDesc.toUpperCase().includes('SALDO DO DIA') || cleanDesc.toUpperCase().includes('SALDO EM CONTA')) {
        continue;
      }

      // Converte valor (Tira ponto de milhar, troca vírgula por ponto)
      const cleanVal = parseFloat(valRaw.replace(/\./g, '').replace(',', '.'));

      newRows.push({
        id: Math.random().toString(36),
        dateRaw, 
        description: cleanDesc,
        amount: cleanVal,
        categoryId: '',
        existingRecurrenceId: '',
        ignore: false
      });
    }
    setRows(newRows);
  };

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // 5. Salvar no Backend
  const handleSave = async () => {
    const toImport = rows.filter(r => !r.ignore && !r.existingRecurrenceId);

    if (toImport.length === 0) {
      alert('Nenhuma transação válida para importar.');
      return;
    }

    const payload = {
      transactions: toImport.map(r => {
        // Agora r.dateRaw é dd/mm/yyyy
        const [day, month, year] = r.dateRaw.split('/');
        
        // Cria data ISO correta com o ano do extrato
        const isoDate = `${year}-${month}-${day}`;

        return {
          description: r.description,
          amount: r.amount, 
          date: isoDate,
          type: r.amount < 0 ? 'EXPENSE' : 'INCOME',
          categoryId: r.categoryId || null
        };
      }),
      bankBalance: (extractedBalance !== null && shouldUpdateBalance) ? extractedBalance : undefined
    };

    try {
      setLoading(true);
      const res = await createBatchTransactions(payload);
      alert(`Transações importadas: ${res.count}. ${res.message}`);
      // setRows([]);
      // setStep('UPLOAD');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar transações.');
    } finally {
      setLoading(false);
    }
  };
  
  if (step === 'UPLOAD') {
    return (
      <div className={styles.container}>
        <div className={styles.topNav}>
          <Link href="/dashboard" className={styles.btnBack}>
            <span>←</span> Voltar para Dashboard
          </Link>
        </div>

        <div className={styles.uploadBox}>
          <h2>Importar Extrato (PDF)</h2>
          <p>Selecione o arquivo PDF do seu banco para conciliação.</p>
          
          <label className={styles.btnFile}>
            Selecionar Arquivo
            <input 
                type="file" 
                accept=".pdf" 
                onChange={handleFileChange} 
            />
          </label>
          
          {loading && <p className={styles.loadingText}>Processando PDF...</p>}
        </div>
      </div>
    );
  }

  return (
      <div className={styles.container}>
        {/* ... (TopNav e Header igual antes) ... */}

        <header className={styles.header}>
            <div className={styles.headerTitle}>
                <h2>Revisão de Importação</h2>
                <span>{rows.length} itens encontrados</span>
            </div>
            {/* Oculta os botões principais se tiver seleção, para dar foco na barra de massa (opcional) */}
            <div className={styles.actions}>
               <button onClick={() => setStep('UPLOAD')} className={styles.btnSec}>Cancelar</button>
               <button onClick={handleSave} className={styles.btnPri} disabled={loading}>
                 {loading ? 'Salvando...' : 'Confirmar Importação'}
               </button>
            </div>
        </header>

        {extractedBalance !== null && (
        <div className={styles.balanceCard}>
          <div className={styles.balanceInfo}>
            <p>Saldo em conta identificado</p>
            <strong>
              {extractedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </div>

          <label className={styles.balanceCheck}>
            <input 
              type="checkbox" 
              checked={shouldUpdateBalance}
              onChange={(e) => setShouldUpdateBalance(e.target.checked)}
            />
            <span>Atualizar saldo da carteira</span>
          </label>
        </div>
      )}

        {/* === BARRA DE AÇÕES EM MASSA (FLUTUANTE OU FIXA) === */}
        {selectedIds.length > 0 && (
          <div className={styles.bulkActionsBar}>
            <div className={styles.bulkCount}>
              <strong>{selectedIds.length}</strong> selecionados
            </div>
            
            <div className={styles.bulkControls}>
              {/* Bulk Categoria */}
              <select onChange={(e) => handleBulkUpdate('categoryId', e.target.value)} defaultValue="">
                <option value="" disabled>Atribuir Categoria...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Bulk Recorrência */}
              <select onChange={(e) => handleBulkUpdate('existingRecurrenceId', e.target.value)} defaultValue="">
                <option value="" disabled>Vincular Recorrência...</option>
                <option value="">(Remover Vínculo)</option>
                {recurrences.map(r => (
                   <option key={r.id} value={r.id}>{r.description}</option>
                ))}
              </select>

              {/* Bulk Ignorar/Recuperar */}
              <button 
                className={styles.btnBulkDanger}
                onClick={() => handleBulkIgnore(true)}
                title="Ignorar selecionados"
              >
                🗑️ Ignorar Tudo
              </button>
              <button 
                className={styles.btnBulkSec}
                onClick={() => handleBulkIgnore(false)}
                title="Recuperar selecionados"
              >
                ↩️ Recuperar
              </button>
            </div>

            <button className={styles.btnCloseBulk} onClick={() => setSelectedIds([])}>
              ✕
            </button>
          </div>
        )}

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {/* CHECKBOX SELECIONAR TUDO */}
                <th width="40px" className={styles.checkCell}>
                  <input 
                    type="checkbox" 
                    checked={rows.length > 0 && selectedIds.length === rows.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th width="60px" style={{textAlign: 'center'}}>Status</th>
                <th>Data</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Categoria</th>
                <th>Já é Recorrente?</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const isOpaque = row.ignore || row.existingRecurrenceId !== '';
                const isSelected = selectedIds.includes(row.id);

                return (
                  <tr 
                    key={row.id} 
                    className={`${isOpaque ? styles.opaqueRow : ''} ${isSelected ? styles.selectedRow : ''}`}
                  >
                    {/* CHECKBOX DA LINHA */}
                    <td className={styles.checkCell}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelect(row.id)}
                      />
                    </td>
                    
                    <td style={{textAlign: 'center'}}>
                       <button 
                         className={styles.iconBtn}
                         onClick={() => updateRow(row.id, 'ignore', !row.ignore)}
                       >
                         {row.ignore ? '🗑️' : '✅'}
                       </button>
                    </td>

                    {/* ... (Resto das colunas igual ao anterior) ... */}
                    <td>{row.dateRaw}</td>
                    <td>
                        <input 
                           type="text" 
                           value={row.description}
                           onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                           disabled={row.ignore} 
                        />
                    </td>
                    <td style={{ color: row.amount < 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>
                        {row.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td>
                        <select 
                           value={row.categoryId} 
                           onChange={(e) => updateRow(row.id, 'categoryId', e.target.value)}
                           disabled={row.ignore}
                        >
                           <option value="">-- Categoria --</option>
                           {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </td>
                    <td>
                        <select 
                           value={row.existingRecurrenceId}
                           onChange={(e) => updateRow(row.id, 'existingRecurrenceId', e.target.value)}
                           className={row.existingRecurrenceId ? styles.recurrenceActive : ''}
                        >
                          <option value="">-- Recorrência --</option>
                           {recurrences.map(r => <option key={r.id} value={r.id}>{r.description}</option>)}
                        </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
}