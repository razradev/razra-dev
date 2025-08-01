<script lang="ts">
	import { goto } from '$app/navigation';
	import { account, ID } from '$lib/appwrite';
	import type { Models } from 'appwrite';
	import { onMount } from 'svelte';

	let loggedInUser: any = $state(null);
	let selectedButton: number = $state(-1);

	onMount(async () => {
		account.get().then((data) => {
			loggedInUser = data;
			if (loggedInUser != null) {
				goto(`/aives`);
			}
		});
	});

	async function login(email: string, password: string, newUser: boolean = false) {
		await account.createEmailPasswordSession(email, password);
		loggedInUser = await account.get();
		if (newUser) {
			goto(`/onboarding?email=${loggedInUser.email}`);
		} else {
			goto(`/aives`);
		}
	}

	async function register(email: string, password: string) {
		await account.create(ID.unique(), email, password);
		login(email, password, true);
	}

	function submit(e) {
		e.preventDefault();
		const formData = new FormData(e.target);
		const type = e.submitter.dataset.type;

		if (type === 'login') {
			login(formData.get('email'), formData.get('password'));
		} else if (type === 'register') {
			register(formData.get('email'), formData.get('password'));
		}
	}
</script>

<main>
	{#if loggedInUser != null}
		<p class="fixed top-0 left-0">
			Logged in as ${loggedInUser.name}
		</p>
	{/if}

	<form onsubmit={submit} class="mx-auto flex w-full max-w-xl flex-col gap-y-4">
		<h1 class="mx-2">Welcome</h1>
		<input type="email" placeholder="Email" name="email" required />
		<input type="password" placeholder="Password" name="password" required />

		<button
			type="submit"
			onfocus={() => (selectedButton = 0)}
			onmouseover={() => (selectedButton = 0)}
			onmouseleave={() => {
				if (selectedButton == 0) selectedButton = -1;
			}}
			data-type="login">{selectedButton == 0 ? '>' : ''} Login</button
		>
		<button
			class="bg-transparent text-lgr hover:bg-lgr hover:text-white"
			type="submit"
			onfocus={() => (selectedButton = 1)}
			onmouseover={() => (selectedButton = 1)}
			onmouseleave={() => {
				if (selectedButton == 1) selectedButton = -1;
			}}
			data-type="register">{selectedButton == 1 ? '>' : ''} Register</button
		>
	</form>
</main>
