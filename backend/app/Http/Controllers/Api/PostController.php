<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller; // 1. Controller を use
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PostController extends Controller // 2. Controller を extends
{
    /**
     * 投稿一覧 (タイムライン)
     */
    public function index()
    {
        $posts = Post::with('user')
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