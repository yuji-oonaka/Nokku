<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ArtistResource\Pages;
use App\Filament\Resources\ArtistResource\RelationManagers;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

class ArtistResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationLabel = 'アーティスト一覧'; // 少し短くしました
    
    protected static ?string $modelLabel = 'アーティスト';
    
    protected static ?string $navigationIcon = 'heroicon-o-microphone';
    
    // ▼▼▼ 変更: UserResourceと同じグループにしてまとめる ▼▼▼
    protected static ?string $navigationGroup = 'ユーザー管理';
    
    protected static ?int $navigationSort = 1;

    public static function canViewAny(): bool
    {
        return Auth::user()->role === 'admin';
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->where('role', 'artist');
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                // ▼▼▼ 修正: 基本情報を折りたたんで、初期状態では閉じておく ▼▼▼
                Forms\Components\Section::make('基本情報')
                    ->description('編集するにはここをクリックして展開してください') // 説明文を追加
                    ->collapsible() // 折りたたみ可能にする
                    ->collapsed()   // 最初から閉じておく
                    ->schema([
                        Forms\Components\TextInput::make('nickname')
                            ->label('アーティスト名')
                            ->required(),
                        
                        Forms\Components\TextInput::make('email')
                            ->email()
                            ->required(),
                        
                        Forms\Components\Hidden::make('role')->default('artist'),
                        
                        Forms\Components\FileUpload::make('image_url')
                            ->label('アイコン画像')
                            ->image()
                            ->avatar()
                            ->directory('avatars')
                            ->disk('public')
                            ->visibility('public')
                            ->formatStateUsing(function ($record) {
                                if (!$record || !$record->getRawOriginal('image_url')) {
                                    return [];
                                }
                                $url = $record->getRawOriginal('image_url');
                                if (str_starts_with($url, 'http')) {
                                    return [];
                                }
                                return [$url];
                            }),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('image_url')
                    ->label('アイコン')
                    ->circular(),
                
                Tables\Columns\TextColumn::make('nickname')
                    ->label('アーティスト名')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('email')
                    ->searchable(),

                Tables\Columns\TextColumn::make('products_count')
                    ->counts('products')
                    ->label('出品数')
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
            RelationManagers\EventsRelationManager::class,
            RelationManagers\ProductsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListArtists::route('/'),
            'create' => Pages\CreateArtist::route('/create'),
            'edit' => Pages\EditArtist::route('/{record}/edit'),
        ];
    }
}