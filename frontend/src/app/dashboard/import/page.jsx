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
  
  // Agora o banco é definido pelo botão que o usuário clica, não por adivinhação
  const [selectedBank, setSelectedBank] = useState(null); // 'ITAU' | 'NUBANK'
  
  // Dados do BD
  const [categories, setCategories] = useState([]);
  const [recurrences, setRecurrences] = useState([]);

  // Dados da Tabela
  const [rows, setRows] = useState([]);
  const [extractedBalance, setExtractedBalance] = useState(null);
  const [shouldUpdateBalance, setShouldUpdateBalance] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // --- FUNÇÕES DE SELEÇÃO E AÇÕES EM MASSA (IGUAIS) ---
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(item => item !== id);
      return [...prev, id];
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === rows.length) {
      setSelectedIds([]); 
    } else {
      setSelectedIds(rows.map(r => r.id));
    }
  };

  const handleBulkUpdate = (field, value) => {
    if (!confirm(`Deseja aplicar esta alteração em ${selectedIds.length} itens?`)) return;

    setRows(prev => prev.map(r => {
      if (selectedIds.includes(r.id)) {
        if (field === 'existingRecurrenceId' && value === "") {
             return { ...r, [field]: "" };
        }
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  const handleBulkIgnore = (shouldIgnore) => {
    setRows(prev => prev.map(r => {
      if (selectedIds.includes(r.id)) {
        return { ...r, ignore: shouldIgnore };
      }
      return r;
    }));
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, recs] = await Promise.all([getCategories(), getRecurrences()]);
        setCategories(cats);
        setRecurrences(recs);
      } catch (error) {
        console.error("Erro ao carregar dados", error);
      }
    }
    loadData();
  }, []);

  // --- 2. Parser do PDF (Atualizado para receber o tipo do banco) ---
  const handleFileChange = async (e, bankType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Define qual banco estamos usando explicitamente
    setSelectedBank(bankType);
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
        
        // Agrupa linhas por Y (altura)
        const rowsMap = new Map();
        textContent.items.forEach((item) => {
          const y = Math.round(item.transform[5]); 
          if (!rowsMap.has(y)) rowsMap.set(y, []);
          rowsMap.get(y).push(item);
        });

        const sortedY = Array.from(rowsMap.keys()).sort((a, b) => b - a);
        sortedY.forEach((y) => {
          const lineItems = rowsMap.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
          const lineString = lineItems.map(item => item.str).join(' ');
          fullText += lineString + '\n';
        });
      }
      
      console.log('Texto Extraído:', fullText);
      
      // Chama o parser específico baseado no botão clicado
      if (bankType === 'NUBANK') {
        parseNubank(fullText);
      } else {
        parseItau(fullText);
      }
      
      extractBalance(fullText);
      setStep('REVIEW');
    } catch (err) {
      alert('Erro ao ler o arquivo PDF.');
      console.error(err);
    } finally {
      setLoading(false);
      // Limpa o input para permitir selecionar o mesmo arquivo novamente se der erro
      e.target.value = ''; 
    }
  };

  // --- PARSER ITAÚ ---
  const parseItau = (text) => {
    const regex = /^\s*(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?[\d\.]*,\d{2})/gm;
    const newRows = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      const [_, dateRaw, descRaw, valRaw] = match;
      const cleanDesc = descRaw.trim();

      if (cleanDesc.toUpperCase().includes('SALDO DO DIA') || cleanDesc.toUpperCase().includes('SALDO EM CONTA')) {
        continue;
      }

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

  // --- PARSER NUBANK ---
  const parseNubank = (text) => {
    const lines = text.split('\n');
    const newRows = [];
    
    const months = {
        'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04', 'MAI': '05', 'JUN': '06',
        'JUL': '07', 'AGO': '08', 'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
    };

    let currentDateRaw = null;
    let currentYear = new Date().getFullYear().toString(); 
    const dateHeaderRegex = /^(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)(\s+\d{4})?/i;
    const transactionRegex = /(.+?)\s+([\d\.]+,\d{2})$/;

    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      const dateMatch = cleanLine.match(dateHeaderRegex);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const monthStr = dateMatch[2].toUpperCase();
        const year = dateMatch[3] ? dateMatch[3].trim() : currentYear; 
        currentYear = year;
        currentDateRaw = `${day}/${months[monthStr]}/${year}`;
        return; 
      }

      if (cleanLine.toUpperCase().includes('TOTAL DE ENTRADAS') || 
          cleanLine.toUpperCase().includes('TOTAL DE SAÍDAS') || 
          cleanLine.toUpperCase().includes('SALDO INICIAL') || 
          cleanLine.toUpperCase().includes('SALDO FINAL')) {
        return;
      }

      if (currentDateRaw) {
        const transMatch = cleanLine.match(transactionRegex);
        if (transMatch) {
          const descRaw = transMatch[1].trim();
          const valRaw = transMatch[2];
          let amount = parseFloat(valRaw.replace(/\./g, '').replace(',', '.'));

          const descUpper = descRaw.toUpperCase();
          const isExpense = descUpper.includes('COMPRA') || descUpper.includes('PAGAMENTO') || descUpper.includes('ENVIA') || descUpper.includes('SAQUE') || descUpper.includes('IOF') || descUpper.includes('TARIFA');
          const isIncome = descUpper.includes('RECEBIDA') || descUpper.includes('DEPÓSITO') || descUpper.includes('DEVOLUÇÃO') || descUpper.includes('ESTORNO') || descUpper.includes('RENDIMENTO');

          if (isExpense) amount = -Math.abs(amount);
          if (isIncome) amount = Math.abs(amount);

          newRows.push({
            id: Math.random().toString(36),
            dateRaw: currentDateRaw,
            description: descRaw,
            amount: amount,
            categoryId: '',
            existingRecurrenceId: '',
            ignore: false
          });
        }
      }
    });
    setRows(newRows);
  };

  const extractBalance = (text) => {
    const regex = /saldo (em conta|final|atual)[\s\S]*?R\$\s*([\d\.]+,?\d{0,2})/i;
    const match = regex.exec(text);
    if (match) {
      setExtractedBalance(parseFloat(match[2].replace(/\./g, '').replace(',', '.')));
    } else {
      setExtractedBalance(null);
    }
  };

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    const toImport = rows.filter(r => !r.ignore && !r.existingRecurrenceId);
    if (toImport.length === 0) return alert('Nenhuma transação válida para importar.');

    const payload = {
      transactions: toImport.map(r => {
        const [day, month, year] = r.dateRaw.split('/');
        return {
          description: r.description,
          amount: r.amount, 
          date: `${year}-${month}-${day}`,
          type: r.amount < 0 ? 'EXPENSE' : 'INCOME',
          categoryId: r.categoryId || null
        };
      }),
      bankBalance: (extractedBalance !== null && shouldUpdateBalance) ? extractedBalance : undefined
    };

    try {
      setLoading(true);
      const res = await createBatchTransactions(payload);
      alert(`Sucesso! ${res.count} transações importadas.`);
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
            <span>←</span> Voltar
          </Link>
        </div>

        <div className={styles.uploadBox}>
          <h2>Importar Extrato (PDF)</h2>
          <p>Selecione o banco para iniciar a importação.</p>
          
          {/* BOTÕES LADO A LADO */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '20px', justifyContent: 'center' }}>
            
            {/* Botão Itaú */}
            <label 
                className={styles.btnFile} 
                style={{ backgroundColor: '#ec7000', borderColor: '#ec7000' }} // Laranja Itaú
            >
              📄 Extrato Itaú
              <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={(e) => handleFileChange(e, 'ITAU')} 
                  style={{ display: 'none' }}
              />
            </label>

            {/* Botão Nubank */}
            <label 
                className={styles.btnFile} 
                style={{ backgroundColor: '#820ad1', borderColor: '#820ad1' }} // Roxo Nubank
            >
              💜 Extrato Nubank
              <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={(e) => handleFileChange(e, 'NUBANK')} 
                  style={{ display: 'none' }}
              />
            </label>

          </div>
          
          {loading && <p className={styles.loadingText} style={{marginTop: '20px'}}>Lendo arquivo...</p>}
        </div>
      </div>
    );
  }

  // --- TELA DE REVISÃO (REVIEW) ---
  return (
      <div className={styles.container}>
        <header className={styles.header}>
            <div className={styles.headerTitle}>
                <h2>Revisão de Importação</h2>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    <span>{rows.length} itens encontrados</span>
                    {/* Badge do Banco Selecionado */}
                    {selectedBank === 'NUBANK' && (
                        <span style={{background: '#820ad1', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px'}}>Nubank</span>
                    )}
                    {selectedBank === 'ITAU' && (
                        <span style={{background: '#ec7000', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px'}}>Itaú</span>
                    )}
                </div>
            </div>
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
              <p>Saldo identificado ({selectedBank === 'ITAU' ? 'Itaú' : 'Nubank'})</p>
              <strong>
                {extractedBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>
            <label className={styles.balanceCheck}>
              <input type="checkbox" checked={shouldUpdateBalance} onChange={(e) => setShouldUpdateBalance(e.target.checked)} />
              <span>Atualizar saldo da carteira</span>
            </label>
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className={styles.bulkActionsBar}>
            <div className={styles.bulkCount}><strong>{selectedIds.length}</strong> selecionados</div>
            <div className={styles.bulkControls}>
              <select onChange={(e) => handleBulkUpdate('categoryId', e.target.value)} defaultValue="">
                <option value="" disabled>Categoria...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select onChange={(e) => handleBulkUpdate('existingRecurrenceId', e.target.value)} defaultValue="">
                <option value="" disabled>Recorrência...</option>
                <option value="">(Remover)</option>
                {recurrences.map(r => <option key={r.id} value={r.id}>{r.description}</option>)}
              </select>
              <button className={styles.btnBulkDanger} onClick={() => handleBulkIgnore(true)}>Ignorar</button>
              <button className={styles.btnBulkSec} onClick={() => handleBulkIgnore(false)}>Recuperar</button>
            </div>
            <button className={styles.btnCloseBulk} onClick={() => setSelectedIds([])}>✕</button>
          </div>
        )}

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th width="40px"><input type="checkbox" checked={rows.length > 0 && selectedIds.length === rows.length} onChange={toggleSelectAll} /></th>
                <th width="60px">Status</th>
                <th>Data</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Categoria</th>
                <th>Recorrência</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const isOpaque = row.ignore || row.existingRecurrenceId !== '';
                const isSelected = selectedIds.includes(row.id);
                return (
                  <tr key={row.id} className={`${isOpaque ? styles.opaqueRow : ''} ${isSelected ? styles.selectedRow : ''}`}>
                    <td className={styles.checkCell}><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(row.id)} /></td>
                    <td style={{textAlign: 'center'}}>
                        <button className={styles.iconBtn} onClick={() => updateRow(row.id, 'ignore', !row.ignore)}>
                          {row.ignore ? '🗑️' : '✅'}
                        </button>
                    </td>
                    <td>{row.dateRaw}</td>
                    <td><input type="text" value={row.description} onChange={(e) => updateRow(row.id, 'description', e.target.value)} disabled={row.ignore} /></td>
                    <td style={{ color: row.amount < 0 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{row.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td>
                        <select value={row.categoryId} onChange={(e) => updateRow(row.id, 'categoryId', e.target.value)} disabled={row.ignore}>
                           <option value="">--</option>
                           {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </td>
                    <td>
                        <select value={row.existingRecurrenceId} onChange={(e) => updateRow(row.id, 'existingRecurrenceId', e.target.value)} className={row.existingRecurrenceId ? styles.recurrenceActive : ''}>
                          <option value="">--</option>
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