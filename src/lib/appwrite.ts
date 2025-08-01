import { Client, Account } from 'appwrite';

export const client = new Client();

client.setEndpoint('https://nyc.cloud.appwrite.io/v1').setProject('688c84820006c5142135'); // Replace with your project ID

export const account = new Account(client);
export { ID } from 'appwrite';
