export function inputCodeCharacter(value: string): string {
    return value.replace(/[^A-Za-z0-9]/g, '').slice(-1);
}

export function pastedCodeCharacters(value: string): string {
    return value.replace(/[^A-Za-z0-9]/g, '').slice(0, 4);
}

export function completeSharedCode(characters: string[]): string | null {
    const code = characters.join('');
    return /^[A-Za-z0-9]{4}$/.test(code) ? code : null;
}
