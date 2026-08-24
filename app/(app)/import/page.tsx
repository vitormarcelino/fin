import { requireSession } from "@/lib/auth/session";
import { ImportForm } from "@/components/import/import-form";

export default async function ImportPage() {
  await requireSession();

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 lg:pb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Importar histórico</h1>
          <p className="text-sm text-foreground/60">
            Suba uma planilha CSV ou XLSX com lançamentos de meses anteriores. A primeira linha
            deve ser o cabeçalho.
          </p>
        </div>
        <a
          href="/import/template"
          className="flex h-9 shrink-0 items-center rounded-lg border border-black/10 px-3 text-sm font-medium active:opacity-70 dark:border-white/15"
        >
          Baixar modelo
        </a>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-4 text-sm dark:border-white/15 dark:bg-transparent">
        <p className="font-medium text-slate-900 dark:text-foreground">Colunas reconhecidas</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="text-foreground/60">
              <tr>
                <th className="py-1 pr-3 font-medium">Coluna</th>
                <th className="py-1 pr-3 font-medium">Obrigatória</th>
                <th className="py-1 font-medium">Formato</th>
              </tr>
            </thead>
            <tbody className="text-foreground/80">
              <tr className="border-t border-black/5 dark:border-white/10">
                <td className="py-1.5 pr-3 font-medium text-slate-900 dark:text-foreground">Data</td>
                <td className="py-1.5 pr-3">Sim</td>
                <td className="py-1.5">AAAA-MM-DD ou DD/MM/AAAA</td>
              </tr>
              <tr className="border-t border-black/5 dark:border-white/10">
                <td className="py-1.5 pr-3 font-medium text-slate-900 dark:text-foreground">Descrição</td>
                <td className="py-1.5 pr-3">Sim</td>
                <td className="py-1.5">texto</td>
              </tr>
              <tr className="border-t border-black/5 dark:border-white/10">
                <td className="py-1.5 pr-3 font-medium text-slate-900 dark:text-foreground">Valor</td>
                <td className="py-1.5 pr-3">Sim</td>
                <td className="py-1.5">1234,56 ou 1234.56</td>
              </tr>
              <tr className="border-t border-black/5 dark:border-white/10">
                <td className="py-1.5 pr-3 font-medium text-slate-900 dark:text-foreground">Recorrente</td>
                <td className="py-1.5 pr-3">Não</td>
                <td className="py-1.5">nome exato de um gasto fixo já cadastrado</td>
              </tr>
              <tr className="border-t border-black/5 dark:border-white/10">
                <td className="py-1.5 pr-3 font-medium text-slate-900 dark:text-foreground">Tipo</td>
                <td className="py-1.5 pr-3">Só sem Recorrente</td>
                <td className="py-1.5">Receita ou Despesa</td>
              </tr>
              <tr className="border-t border-black/5 dark:border-white/10">
                <td className="py-1.5 pr-3 font-medium text-slate-900 dark:text-foreground">Classificação</td>
                <td className="py-1.5 pr-3">Não</td>
                <td className="py-1.5">Fixo ou Variável</td>
              </tr>
              <tr className="border-t border-black/5 dark:border-white/10">
                <td className="py-1.5 pr-3 font-medium text-slate-900 dark:text-foreground">Vencimento</td>
                <td className="py-1.5 pr-3">Não</td>
                <td className="py-1.5">mesmo formato de Data</td>
              </tr>
              <tr className="border-t border-black/5 dark:border-white/10">
                <td className="py-1.5 pr-3 font-medium text-slate-900 dark:text-foreground">Tags</td>
                <td className="py-1.5 pr-3">Não</td>
                <td className="py-1.5">separadas por vírgula</td>
              </tr>
              <tr className="border-t border-black/5 dark:border-white/10">
                <td className="py-1.5 pr-3 font-medium text-slate-900 dark:text-foreground">Observações</td>
                <td className="py-1.5 pr-3">Não</td>
                <td className="py-1.5">texto</td>
              </tr>
              <tr className="border-t border-black/5 dark:border-white/10">
                <td className="py-1.5 pr-3 font-medium text-slate-900 dark:text-foreground">Status</td>
                <td className="py-1.5 pr-3">Não</td>
                <td className="py-1.5">Pago (padrão) ou Pendente</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-foreground/60">
          Preenchendo <span className="font-medium">Recorrente</span> com o nome exato de um gasto
          fixo já cadastrado, o lançamento é vinculado a ele — herda tipo, classificação (Fixo) e
          tags do cadastro, e Tipo/Classificação/Tags do arquivo são ignorados nessa linha. Se já
          existir um lançamento daquele mês para esse gasto fixo, ele é atualizado em vez de
          duplicado — então reimportar o mesmo arquivo é seguro.
        </p>
      </div>

      <ImportForm />
    </div>
  );
}
