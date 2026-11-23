// ExcelStatusBar.tsx
// Barra de conexão/criação/vínculo/backup da planilha

import React, { useRef } from 'react'
import {
  FileSpreadsheet, CheckCircle2, AlertCircle, Loader2,
  Unlink, Download, Upload, PlusCircle, Link2,
} from 'lucide-react'
import { useDatabaseContext } from '../context/DatabaseContext'

export function ExcelStatusBar() {
  const {
    connectionStatus,
    connectedFileName,
    fsaSupported,
    createNewDatabase,
    linkExistingDatabase,
    reconnectWithPermission,
    disconnectDatabase,
    exportBackup,
    importBackupFile,
  } = useDatabaseContext()

  const importRef = useRef<HTMLInputElement>(null)

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await importBackupFile(file)
    e.target.value = ''
  }

  const statusConfig = {
    disconnected: {
      icon: <Unlink size={14} className="text-zinc-400" />,
      label: 'Nenhuma planilha conectada',
      dot: 'bg-zinc-500',
    },
    'needs-permission': {
      icon: <AlertCircle size={14} className="text-amber-400" />,
      label: `${connectedFileName ?? 'Planilha'} — clique para reconectar`,
      dot: 'bg-amber-400',
    },
    syncing: {
      icon: <Loader2 size={14} className="text-brand-400 animate-spin" />,
      label: 'Sincronizando…',
      dot: 'bg-brand-400 animate-pulse-soft',
    },
    connected: {
      icon: <CheckCircle2 size={14} className="text-emerald-400" />,
      label: connectedFileName ?? 'Planilha conectada',
      dot: 'bg-emerald-400',
    },
    error: {
      icon: <AlertCircle size={14} className="text-red-400" />,
      label: 'Erro ao acessar planilha',
      dot: 'bg-red-400',
    },
  }

  const cfg = statusConfig[connectionStatus]

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-surface-700 border-b border-white/5 text-xs">
      {/* Status indicator */}
      <button
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
        onClick={connectionStatus === 'needs-permission' ? reconnectWithPermission : undefined}
        title={connectionStatus === 'needs-permission' ? 'Clique para reconectar (1 clique)' : undefined}
      >
        <FileSpreadsheet size={14} className="text-brand-400" />
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.icon}
        <span className="text-zinc-300 max-w-[180px] truncate">{cfg.label}</span>
      </button>

      <div className="flex-1" />

      {/* Ações */}
      {fsaSupported && (
        <>
          <button
            onClick={createNewDatabase}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            title="Criar nova planilha vagas_games_db.xlsx"
          >
            <PlusCircle size={13} />
            Nova planilha
          </button>
          <button
            onClick={linkExistingDatabase}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            title="Vincular planilha .xlsx existente"
          >
            <Link2 size={13} />
            Vincular
          </button>
        </>
      )}

      <button
        onClick={exportBackup}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
        title="Exportar backup .xlsx"
      >
        <Download size={13} />
        Exportar backup
      </button>

      <button
        onClick={() => importRef.current?.click()}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors"
        title="Importar planilha .xlsx (substitui dados locais)"
      >
        <Upload size={13} />
        Importar
      </button>

      {connectionStatus === 'connected' && (
        <button
          onClick={disconnectDatabase}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors"
          title="Desconectar planilha"
        >
          <Unlink size={13} />
        </button>
      )}

      <input
        ref={importRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleImport}
      />
    </div>
  )
}
