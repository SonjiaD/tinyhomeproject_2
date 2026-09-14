# Migrations

Every change ever applied to the live Supabase project, in the order it was applied. The
folder is the complete history: a fresh project run through these files in filename order
ends up with the same schema as production.

Filenames are `YYYYMMDD_NN_name.sql`. The date is when the file was written; the `NN` keeps
same-day files in application order. The exact version stamp Supabase recorded is in each
file's header.

**All of these are already applied to the live project.** Do not re-run them there. They are
for rebuilding from scratch, standing up a second environment, or reading the history.

Two things worth knowing about how they got here:

- The first four (`20260702_*`) and the two `20260907_01`/`_02` hardening files were applied
  directly through the Supabase MCP and only later exported back into the repo, verbatim, from
  `supabase_migrations.schema_migrations`. That export is the reason the folder is complete.
- `20260830_02_enable_rls.sql` was written on 30 August and applied on 7 September. The gap is
  deliberate: it is step two of a two-phase cutover, and its header explains why it could not
  run until the frontend that reads the new views was deployed.

To check the folder still matches production, compare its names against:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```
