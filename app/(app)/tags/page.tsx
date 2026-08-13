import { requireSession } from "@/lib/auth/session";
import { listTags } from "@/lib/tags/queries";
import { CreateTagForm } from "@/components/tags/create-tag-form";
import { TagItem } from "@/components/tags/tag-item";

export default async function TagsPage() {
  const session = await requireSession();
  const tags = await listTags(session.user.id);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 lg:pb-6">
      <h1 className="text-xl font-semibold">Tags</h1>
      <CreateTagForm />
      {tags.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-foreground/60 dark:border-white/15">
          Você ainda não tem tags. Crie a primeira acima.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {tags.map((tag) => (
            <TagItem key={tag.id} tag={tag} />
          ))}
        </div>
      )}
    </div>
  );
}
