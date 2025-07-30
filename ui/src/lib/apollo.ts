import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const httpLink = createHttpLink({
  uri: 'https://api.platform.dev.opentargets.xyz/api/v4/graphql'
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
}); 