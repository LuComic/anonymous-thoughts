<script lang="ts">
	import { browser } from '$app/environment';
	import { getOrCreateAnonymousUserId } from '$lib/anonymousUser';
	import ThoughtReceiving from '$lib/components/ThoughtReceiving.svelte';
	import ThoughtSending from '$lib/components/ThoughtSending.svelte';
	import { api } from '../convex/_generated/api.js';
	import { useConvexClient, useQuery } from 'convex-svelte';

	const client = useConvexClient();
	let userId = $state('');
	let receivedThought = $state<string | null | undefined>(undefined);

	const hasSentToday = useQuery(api.thoughts.hasSentToday, () =>
		userId ? { user: userId } : 'skip'
	);
	const thought = useQuery(api.thoughts.getThought, () =>
		userId && hasSentToday.data && receivedThought === undefined ? { user: userId } : 'skip'
	);

	$effect(() => {
		if (!browser) return;

		const id = getOrCreateAnonymousUserId();
		if (!userId) {
			userId = id;
			client.mutation(api.thoughts.ensureUser, { user: id });
		}

		if (!hasSentToday.data) {
			receivedThought = undefined;
			return;
		}

		if (!thought.data || receivedThought !== undefined) return;
		receivedThought = thought.data.content;
		client.mutation(api.thoughts.markThoughtReceived, { note: thought.data.id });
	});
</script>

<div class="flex flex-col gap-4">
	<h1 class="title text-xl lg:text-3xl">Write something and send it to the void</h1>
	<p>One note a day. Send one to see one</p>
	<ThoughtSending {userId} disabled={!userId || hasSentToday.data === true} />

	<h1 class="title mt-10 text-xl lg:text-3xl">What someone else wrote</h1>
	{#if hasSentToday.data}
		<ThoughtReceiving thought={receivedThought ?? null} />
	{:else}
		<p>Send a note to see a note</p>
	{/if}
</div>

<style>
	.title {
		font-family: 'Merriweather Variable', serif;
	}
</style>
