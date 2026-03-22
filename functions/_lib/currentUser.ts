import type { AuthenticatedUser, RequestContextData, RequestAuthState } from "./types";

function mergeIdentityIntoUser(auth: RequestAuthState) {
  const identity = auth.accessIdentity?.value;

  if (!identity) {
    return auth.user;
  }

  const displayName = identity.name?.trim() || auth.user.displayName;
  const resolvedId =
    identity.user_uuid?.trim() || identity.id?.trim() || auth.user.id || auth.user.subject;

  auth.user = {
    ...auth.user,
    displayName: displayName || null,
    id: resolvedId || null
  };

  return auth.user;
}

async function loadIdentity(auth: RequestAuthState) {
  if (!auth.accessIdentity?.getIdentity) {
    return null;
  }

  if (auth.accessIdentity.loaded) {
    return auth.accessIdentity.value;
  }

  if (!auth.accessIdentity.pending) {
    auth.accessIdentity.pending = auth.accessIdentity
      .getIdentity()
      .then((identity) => identity ?? null)
      .catch(() => null);
  }

  const identity = await auth.accessIdentity.pending;
  auth.accessIdentity.loaded = true;
  auth.accessIdentity.value = identity;
  delete auth.accessIdentity.pending;

  return identity;
}

export async function getCurrentUser(
  data: RequestContextData,
  options: { includeIdentity?: boolean } = {}
): Promise<AuthenticatedUser | null> {
  const auth = data.auth;

  if (!auth) {
    return null;
  }

  if (!options.includeIdentity || !auth.accessIdentity) {
    return auth.user;
  }

  await loadIdentity(auth);
  return mergeIdentityIntoUser(auth);
}
