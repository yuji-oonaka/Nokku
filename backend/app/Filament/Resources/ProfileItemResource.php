<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProfileItemResource\Pages;
use App\Models\ProfileItem;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Auth;

class ProfileItemResource extends Resource
{
    protected static ?string $model = ProfileItem::class;
    protected static ?string $navigationIcon = 'heroicon-o-photo';
    protected static ?string $navigationGroup = 'ガチャ管理';
    protected static ?string $navigationLabel = '素材（アイコン）管理'; // サイドメニュー名
    protected static ?string $modelLabel = '素材'; // ボタンなどの表示名

    public static function canViewAny(): bool
    {
        return Auth::user()->role === 'admin';
    }

    public static function canCreate(): bool
    {
        return static::canViewAny();
    }
    public static function canEdit($record): bool
    {
        return static::canViewAny();
    }
    public static function canDelete($record): bool
    {
        return static::canViewAny();
    }

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Section::make('基本情報')->schema([
                Forms\Components\TextInput::make('name')
                    ->label('アイテム名')
                    ->required()
                    ->maxLength(255),
                Forms\Components\Select::make('type')
                    ->label('種類')
                    ->options([
                        ProfileItem::TYPE_ICON => 'アイコン',
                        ProfileItem::TYPE_FRAME => 'フレーム',
                        ProfileItem::TYPE_BACKGROUND => '背景',
                    ])->required(),
                Forms\Components\Select::make('rarity')
                    ->label('レアリティ')
                    ->options(['N' => 'N', 'R' => 'R', 'SR' => 'SR', 'SSR' => 'SSR', 'UR' => 'UR'])
                    ->required(),
            ])->columns(2),
            Forms\Components\Section::make('ビジュアル')->schema([
                Forms\Components\FileUpload::make('image_url')
                    ->label('画像')
                    ->image()
                    ->disk('public') // asset('storage/...') と整合
                    ->directory('gacha_items')
                    ->visibility('public')
                    ->required(),
                Forms\Components\Toggle::make('is_default')
                    ->label('初期配布アイテム')
                    ->helperText('新規登録ユーザーに自動付与されます'),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            Tables\Columns\ImageColumn::make('image_url')
                ->label('画像'),
            Tables\Columns\TextColumn::make('name')
                ->label('アイテム名')
                ->searchable(),
            // BadgeColumn ではなく TextColumn の badge() を使用
            Tables\Columns\TextColumn::make('type')
                ->label('種類')
                ->badge()
                ->color(fn(string $state): string => match ($state) {
                    'icon' => 'info',
                    'frame' => 'success',
                    'background' => 'warning',
                    default => 'gray',
                }),
            Tables\Columns\TextColumn::make('rarity')
                ->label('レアリティ')
                ->badge()
                ->color(fn(string $state): string => match ($state) {
                    'UR' => 'danger',
                    'SSR' => 'warning',
                    'SR' => 'primary',
                    default => 'gray',
                }),
        ])->filters([]);
    }

    public static function getRelations(): array
    {
        return [
            // 必要に応じて将来的にリレーションを追加
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListProfileItems::route('/'),
            'create' => Pages\CreateProfileItem::route('/create'),
            'edit' => Pages\EditProfileItem::route('/{record}/edit'),
        ];
    }
}