<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { account } from '$lib/appwrite';
	import { onMount } from 'svelte';
	let loggedInUser: any;

	let selectedButton = $state(-1);
	let typedName = $state('');

	onMount(() => {
		account.get().then((data) => {
			if (data == null || page.url.searchParams.get('email') != data.email) {
				goto('/');
			}
			loggedInUser = data;
		});
	});

	function submit() {
		account.updateName(typedName).then(() => {
			goto('/aives');
		});
	}
</script>

<main>
	<form onsubmit={submit} class="mx-auto flex w-full max-w-xl flex-col gap-y-4">
		<h1 class="mx-2">What's your name?</h1>
		<input type="text" placeholder="Name" name="name" bind:value={typedName} required />
		<button
			type="submit"
			onfocus={() => (selectedButton = 1)}
			onmouseover={() => (selectedButton = 1)}
			onmouseleave={() => {
				if (selectedButton == 1) selectedButton = -1;
			}}
			data-type="name">{selectedButton == 1 ? '>' : ''} Enter</button
		>
	</form>
</main>
