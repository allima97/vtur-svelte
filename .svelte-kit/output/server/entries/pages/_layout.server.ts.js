const load = async ({ locals: { safeGetSession }, cookies }) => {
  const { session, user } = await safeGetSession();
  return {
    session,
    user
  };
};
export {
  load
};
