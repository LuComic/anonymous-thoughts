<script lang="ts">
	import { api } from '../../convex/_generated/api.js';
	import { useConvexClient } from 'convex-svelte';

	let {
		userId,
		disabled
	}: {
		userId: string;
		disabled: boolean;
	} = $props();

	const client = useConvexClient();
	let note = $state('');
	let sending = $state(false);

	async function sendThought() {
		const content = note.trim();
		if (!content || disabled || sending) return;

		sending = true;
		try {
			await client.mutation(api.thoughts.sendThought, {
				user: userId,
				note: content
			});
			note = '';
		} finally {
			sending = false;
		}
	}
</script>

<textarea class="h-auto w-full rounded-md bg-zinc-900 lg:text-lg" bind:value={note}></textarea>
<button
	disabled={disabled || sending || !note.trim()}
	onclick={sendThought}
	class="mr-auto w-auto rounded-md bg-white/90 px-2 py-0.5 font-medium text-black hover:bg-white/70 disabled:cursor-not-allowed"
	>Send</button
>

<style>
	textarea {
		field-sizing: content;
		min-height: 100px;
		padding: 2px 4px;
		outline-color: rgba(255, 255, 255, 50%);
		outline-style: dotted;
	}
</style>
