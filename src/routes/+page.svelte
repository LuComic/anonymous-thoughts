<script lang="ts">
	import { browser } from '$app/environment';
	import { getOrCreateAnonymousUserId } from '$lib/anonymousUser';
	import ThoughtReceiving from '$lib/components/ThoughtReceiving.svelte';
	import ThoughtSending from '$lib/components/ThoughtSending.svelte';
	import { api } from '../convex/_generated/api.js';
	import { useConvexClient, useQuery } from 'convex-svelte';

	const client = useConvexClient();
	let userId = $state('');

	const hasSentToday = useQuery(api.thoughts.hasSentToday, () =>
		userId ? { user: userId } : 'skip'
	);
	const thought = useQuery(api.thoughts.getThought, () =>
		userId && hasSentToday.data ? { user: userId } : 'skip'
	);

	$effect(() => {
		if (!browser) return;

		const id = getOrCreateAnonymousUserId();
		userId = id;
		client.mutation(api.thoughts.ensureUser, { user: id });
	});

	function handleSent() {
		// The Convex queries update live after the mutation changes last_sent.
	}
</script>

<div class="flex flex-col gap-4">
	<h1 class="title text-xl lg:text-3xl">Write something and send it to the void</h1>
	<ThoughtSending {userId} disabled={!userId || hasSentToday.data === true} onSent={handleSent} />

	<h1 class="title mt-10 text-xl lg:text-3xl">What someone else wrote</h1>
	{#if hasSentToday.data}
		<ThoughtReceiving thought={thought.data ?? null} />
	{/if}
</div>

<style>
	.title {
		font-family: 'Merriweather Variable', serif;
	}
</style>
