import mongoose from 'mongoose';

export const connectDatabase = (uri: string) => mongoose.connect(uri);
export default mongoose.connection;
