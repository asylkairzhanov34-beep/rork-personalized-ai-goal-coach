export const getRorkConfig = () => {
  const toolkitUrl = process.env.EXPO_PUBLIC_TOOLKIT_URL || 'https://toolkit.rork.com';
  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID || 'z054j4yerxhk7iq0ot5f3';
  const teamId = process.env.EXPO_PUBLIC_TEAM_ID || '';
  
  console.log('[RorkConfig] Configuration:');
  console.log('- Toolkit URL:', toolkitUrl);
  console.log('- Project ID:', projectId);
  console.log('- Team ID:', teamId || '(not set)');
  
  return {
    toolkitUrl,
    projectId,
    teamId,
  };
};
