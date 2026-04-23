"""
Script para hidratar arquivo OneDrive e extrair questoes.
Usa a API nativa do Windows para acessar arquivos cloud-only.
"""
import ctypes
import ctypes.wintypes
import os
import sys
import json
import re

SOURCE_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'cnh', 'banco nacional de questoes em markdown.md')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'questions.json')

def try_hydrate_onedrive(path):
    """Tenta hidratar o arquivo OneDrive usando CreateFile com flags especiais."""
    GENERIC_READ = 0x80000000
    FILE_SHARE_READ = 0x00000001
    OPEN_EXISTING = 3
    FILE_ATTRIBUTE_NORMAL = 0x80
    FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000
    INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value

    kernel32 = ctypes.windll.kernel32
    
    # Tenta abrir sem flag reparse point para forcar download
    handle = kernel32.CreateFileW(
        path,
        GENERIC_READ,
        FILE_SHARE_READ,
        None,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        None
    )
    
    if handle == INVALID_HANDLE_VALUE:
        error = kernel32.GetLastError()
        print(f"CreateFile falhou com erro: {error}")
        return False
    
    # Le o arquivo
    file_size_high = ctypes.c_ulong(0)
    file_size_low = kernel32.GetFileSize(handle, ctypes.byref(file_size_high))
    file_size = (file_size_high.value << 32) | file_size_low
    
    print(f"Tamanho do arquivo: {file_size} bytes")
    
    if file_size == 0:
        kernel32.CloseHandle(handle)
        return False
    
    buffer = ctypes.create_string_buffer(file_size)
    bytes_read = ctypes.c_ulong(0)
    
    success = kernel32.ReadFile(handle, buffer, file_size, ctypes.byref(bytes_read), None)
    kernel32.CloseHandle(handle)
    
    if not success:
        print(f"ReadFile falhou")
        return False
    
    content = buffer.raw[:bytes_read.value].decode('utf-8', errors='replace')
    return content


def normalize_difficulty(raw):
    lower = raw.lower()
    if 'f' in lower and ('cil' in lower or 'acil' in lower):
        return 'easy'
    if 'interm' in lower:
        return 'medium'
    if 'dif' in lower:
        return 'hard'
    return 'medium'


def shuffle_list(lst):
    import random
    shuffled = lst[:]
    random.shuffle(shuffled)
    return shuffled


def parse_questions(content):
    questions = []
    lines = content.split('\n')
    
    current_part = ''
    current_module = ''
    current_module_num = 0
    i = 0
    
    while i < len(lines):
        line = lines[i].strip()
        
        if line.startswith('## PARTE'):
            current_part = line.replace('## ', '').strip()
            i += 1
            continue
        
        if line.startswith('### '):
            current_module = line.replace('### ', '').strip()
            match = re.search(r'M[OÓ]DULO\s+(\d+)', current_module, re.IGNORECASE)
            if match:
                current_module_num = int(match.group(1))
            i += 1
            continue
        
        q_match = re.match(r'^l\s+\((F[aá]cil|Intermedi[aá]rio|Dif[ií]cil)\)\s+(\d+)\.\s+(.+)', line, re.IGNORECASE)
        if q_match:
            difficulty = normalize_difficulty(q_match.group(1))
            number = int(q_match.group(2))
            question_text = q_match.group(3)
            
            i += 1
            while i < len(lines):
                nl = lines[i].strip()
                if (nl == '' or nl.startswith('Alternativa correta:') or 
                    nl.startswith('Código da placa:') or nl.startswith('Respostas incorretas:')):
                    break
                if re.match(r'^l\s+\((F[aá]cil|Intermedi[aá]rio|Dif[ií]cil)\)\s+\d+\.', nl, re.IGNORECASE):
                    break
                question_text += ' ' + nl
                i += 1
            
            question_text = question_text.strip()
            
            plate_code = ''
            while i < len(lines) and lines[i].strip() == '':
                i += 1
            if i < len(lines) and lines[i].strip().startswith('Código da placa:'):
                plate_code = lines[i].strip().replace('Código da placa:', '').strip()
                i += 1
            while i < len(lines) and lines[i].strip() == '':
                i += 1
            
            correct_answer = ''
            if i < len(lines) and lines[i].strip().startswith('Alternativa correta:'):
                correct_answer = lines[i].strip().replace('Alternativa correta:', '').strip()
                correct_answer = re.sub(r'\s*3\s*$', '', correct_answer).strip()
                i += 1
                while i < len(lines):
                    nl = lines[i].strip()
                    if nl == '' or nl.startswith('Comentário:') or nl.startswith('Respostas incorretas:'):
                        break
                    correct_answer += ' ' + nl
                    i += 1
                correct_answer = correct_answer.strip()
            while i < len(lines) and lines[i].strip() == '':
                i += 1
            
            comment = ''
            if i < len(lines) and lines[i].strip().startswith('Comentário:'):
                comment = lines[i].strip().replace('Comentário:', '').strip()
                i += 1
                while i < len(lines):
                    nl = lines[i].strip()
                    if nl == '' or nl.startswith('Respostas incorretas:'):
                        break
                    comment += ' ' + nl
                    i += 1
                comment = comment.strip()
            while i < len(lines) and lines[i].strip() == '':
                i += 1
            
            wrong_answers = []
            if i < len(lines) and lines[i].strip().startswith('Respostas incorretas:'):
                i += 1
                while i < len(lines):
                    nl = lines[i].strip()
                    if nl == '':
                        i += 1
                        j = i
                        while j < len(lines) and lines[j].strip() == '':
                            j += 1
                        if j < len(lines) and lines[j].strip().startswith('7 '):
                            i = j
                            continue
                        break
                    if nl.startswith('7 '):
                        wrong_answers.append(nl[2:].strip())
                    elif re.match(r'^l\s+\(', nl) or nl.startswith('## ') or nl.startswith('### '):
                        break
                    i += 1
            
            if question_text and correct_answer:
                all_answers = shuffle_list([correct_answer] + wrong_answers)
                part_slug = re.sub(r'\s+', '-', current_part.lower()) if current_part else 'geral'
                questions.append({
                    'id': f'{part_slug}-m{current_module_num}-q{number}',
                    'number': number,
                    'part': current_part,
                    'module': current_module,
                    'moduleNumber': current_module_num,
                    'difficulty': difficulty,
                    'question': question_text,
                    'correctAnswer': correct_answer,
                    'wrongAnswers': wrong_answers,
                    'allAnswers': all_answers,
                    'comment': comment,
                    'plateCode': plate_code or None,
                })
            continue
        
        i += 1
    
    return questions


def main():
    abs_path = os.path.abspath(SOURCE_FILE)
    print(f"Tentando ler: {abs_path}")
    
    # Tenta via ctypes
    content = try_hydrate_onedrive(abs_path)
    
    if not content:
        print("Nao foi possivel ler via ctypes. Tentando leitura normal...")
        try:
            with open(abs_path, 'r', encoding='utf-8') as f:
                content = f.read()
            if not content.strip():
                print("Arquivo vazio. O arquivo OneDrive precisa ser sincronizado.")
                print("\nSolucao: Clique com botao direito no arquivo no Explorer e escolha")
                print("'Manter sempre neste dispositivo' (Keep always on this device)")
                sys.exit(1)
        except Exception as e:
            print(f"Erro: {e}")
            sys.exit(1)
    
    print(f"Conteudo lido: {len(content)} caracteres")
    questions = parse_questions(content)
    
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ {len(questions)} questoes extraidas!")
    
    by_module = {}
    for q in questions:
        key = q['module'] or 'Desconhecido'
        by_module[key] = by_module.get(key, 0) + 1
    
    print("\nQuestoes por modulo:")
    for mod, count in sorted(by_module.items()):
        print(f"  {mod}: {count}")


if __name__ == '__main__':
    main()
