import * as gqlTypes from "./user.types.gql";
import * as gqlArgs from './user.args.gql'
import { UserResolver } from "./user.resolver";

class UserGQLSchema {
  private userResolver: UserResolver = new UserResolver();
  constructor() {}

  registerQuery = () => {
    return {
      sayHi: {
        type: gqlTypes.welcome,
        resolve: this.userResolver.welcome,
      },
      
      allUser: {
        type: gqlTypes.allUsers,
        args: gqlArgs.allUsers,
        resolve: this.userResolver.allUsers,
      },
      
      // search: {
      //   type: gqlTypes.searchs,
      //   args: gqlArgs.searchs,
      //   resolve: this.userResolver.searchs,
      // },

    };
  };

  registerMutation = () => {
    return {
      sayHii: {
        type: gqlTypes.welcome,
        resolve: this.userResolver.welcome,
      },
    };
  };
}

export default new UserGQLSchema();
