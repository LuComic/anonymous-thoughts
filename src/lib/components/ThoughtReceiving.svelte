<script lang="ts">
	let { thought }: { thought: string | null } = $props();
</script>

<div class="w-full rounded-md border border-zinc-900 px-2 py-1 text-zinc-300 lg:text-lg">
	{thought ?? 'No one else has sent a note yet.'}
</div>
