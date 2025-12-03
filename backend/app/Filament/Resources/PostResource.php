<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PostResource\Pages;
use App\Models\Post;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class PostResource extends Resource
{
    protected static ?string $model = Post::class;

    protected static ?string $navigationIcon = 'heroicon-o-megaphone'; // アイコンをメガホンに

    protected static ?string $navigationLabel = 'お知らせ管理';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                // 投稿者 (アーティスト)
                Forms\Components\Select::make('user_id')
                    ->relationship('user', 'nickname')
                    ->label('投稿者')
                    ->searchable()
                    ->required(),

                Forms\Components\TextInput::make('title')
                    ->label('タイトル')
                    ->required()
                    ->maxLength(255)
                    ->columnSpanFull(),

                // 画像URL
                Forms\Components\TextInput::make('image_url')
                    ->label('画像URL')
                    ->url()
                    ->columnSpanFull(),

                // 本文
                Forms\Components\Textarea::make('body')
                    ->label('本文')
                    ->required()
                    ->rows(10) // 少し広めに
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('image_url')
                    ->label('画像')
                    ->square(),

                Tables\Columns\TextColumn::make('title')
                    ->label('タイトル')
                    ->searchable()
                    ->sortable()
                    ->limit(30), // 長すぎる場合は省略

                Tables\Columns\TextColumn::make('user.nickname')
                    ->label('投稿者')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('投稿日時')
                    ->dateTime('Y/m/d H:i')
                    ->sortable(),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPosts::route('/'),
            'create' => Pages\CreatePost::route('/create'),
            'edit' => Pages\EditPost::route('/{record}/edit'),
        ];
    }
}