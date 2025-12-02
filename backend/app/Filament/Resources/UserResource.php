<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Filament\Resources\UserResource\RelationManagers;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Hash;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationIcon = 'heroicon-o-users';

    // ナビゲーションの表示名を変更
    protected static ?string $navigationLabel = 'ユーザー・アーティスト管理';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('real_name')
                    ->label('本名')
                    ->maxLength(255),
                    
                Forms\Components\TextInput::make('nickname')
                    ->label('アーティスト名 / ニックネーム')
                    ->maxLength(255),

                Forms\Components\TextInput::make('email')
                    ->email()
                    ->required()
                    ->maxLength(255),

                // 権限選択（ここが重要！）
                Forms\Components\Select::make('role')
                    ->label('権限')
                    ->options([
                        'artist' => 'アーティスト (Artist)',
                        'admin'  => '管理者 (Admin)',
                        'user'   => '一般ユーザー (User)',
                    ])
                    ->required()
                    ->default('artist'), // デフォルトをアーティストにしておく

                // パスワード入力（作成時のみ必須、自動ハッシュ化）
                Forms\Components\TextInput::make('password')
                    ->password()
                    ->dehydrated(fn ($state) => filled($state))
                    ->required(fn (string $context): bool => $context === 'create'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('real_name')
                    ->label('本名')
                    ->searchable(),

                Tables\Columns\TextColumn::make('nickname')
                    ->label('アーティスト名')
                    ->searchable(),

                Tables\Columns\TextColumn::make('email')
                    ->searchable(),

                // 権限を色分けして表示
                Tables\Columns\TextColumn::make('role')
                    ->label('権限')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'admin' => 'danger',   // 赤
                        'artist' => 'success', // 緑
                        'user' => 'gray',      // グレー
                    }),
            ])
            ->filters([
                // 権限で絞り込みできるようにする
                Tables\Filters\SelectFilter::make('role')
                    ->options([
                        'artist' => 'アーティスト',
                        'admin' => '管理者',
                        'user' => '一般ユーザー',
                    ]),
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
            'index' => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'edit' => Pages\EditUser::route('/{record}/edit'),
        ];
    }
}