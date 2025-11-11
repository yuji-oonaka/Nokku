<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller; // 1. Controller を use
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PostController extends Controller // 2. Controller を extends
{
    /**
     * 投稿一覧 (タイムライン)
     */
    public function index()
    {
        // 1. ログイン中のユーザーを取得
        $user = Auth::user();

        // 2. ユーザーがフォローしているアーティストのIDリストを取得
        $followingArtistIds = $user->following()->pluck('id');

        // 3. 自分のIDもリストに追加 (自分の投稿も表示するため)
        $followingArtistIds->push($user->id);

        // 4. すべての「管理者」のIDリストを取得
        $adminIds = User::where('role', 'admin')->pluck('id');

        // 5. ★ 投稿を検索
        $posts = Post::with('user')
            // 条件A: 投稿者が「フォロー中 (または自分)」である
            ->whereIn('user_id', $followingArtistIds)
            
            // ★ 条件B: または、投稿者が「管理者」である
            ->orWhereIn('user_id', $adminIds)
            
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($posts);
    }

    /**
     * 新規投稿
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:1000',
            'image_url' => 'nullable|string|url',
        ]);

        $user = Auth::user();

        $post = $user->posts()->create([
            'content' => $validated['content'],
            'image_url' => $validated['image_url'] ?? null,
        ]);

        return response()->json($post->load('user'), 201);
    }
}