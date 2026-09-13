// Replace these mock functions with backend calls when the API is available.
export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const getAvailability = async () => [{ group: 'O+', units: 24 }, { group: 'A+', units: 18 }];
export const submitEmergencyRequest = async (request) => ({ success: true, request });
