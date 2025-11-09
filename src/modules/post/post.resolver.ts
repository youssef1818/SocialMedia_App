import { HPostDocument, LikeActionEnum } from '../../DB/model/Post.model';
import { IAuthGraph } from './../graphql/schema.interface.gql';
import { PostService } from './post.service';

export class PostResolver {
    private postService: PostService = new PostService();

    constructor(){}

    allPosts = async (
        parent:unknown, 
        args: {page:number, size:number}, 
        context: IAuthGraph
    ):Promise<{
      docsCount?:number;
      limit?:number;
      pagesCount?:number;
      currentPage?: number | undefined;
      result: HPostDocument[];
}> => {
        return await this.postService.allPosts(args, context.user)
    };

    likePost = async (
        parent:unknown, 
        args: {postId:string, action:LikeActionEnum}, 
        context: IAuthGraph
    ):Promise<HPostDocument> => {
        return await this.postService.likeGraphPost(args, context.user)
    };




}