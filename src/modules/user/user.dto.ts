import z from "zod";
import { freezeAccount, logout, restoreAccount, hardDeleteAccount } from './user.validation';

export type ILogoutDTO = z.infer<typeof logout.body>;
export type IFreezeAccountDTO = z.infer<typeof freezeAccount.params>;
export type IRestoreAccountDTO = z.infer<typeof restoreAccount.params>;
export type IHardDeleteAccounttDTO = z.infer<typeof hardDeleteAccount.params>;