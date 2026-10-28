import type { Object3D } from 'three';

export const ROCKETBOX_RIG = {
  id: 'rocketbox-biped-v1',
  bones: {
    head: 'Bip01 Head',
    rightUpperArm: 'Bip01 R UpperArm',
    rightForearm: 'Bip01 R Forearm',
    rightHand: 'Bip01 R Hand',
  },
  fingerBonePattern: /^Bip01[ _][LR][ _]Finger[1-4](\d?)$/,
} as const;

export type RocketboxBoneRole = keyof typeof ROCKETBOX_RIG.bones;

export function normalizeRigBoneName(name: string): string {
  return name.replace(/[_\s]+/g, ' ').trim();
}

export function rigBoneName(role: RocketboxBoneRole): string {
  return ROCKETBOX_RIG.bones[role];
}

export function findRigBone(root: Object3D, nameOrRole: string): Object3D | undefined {
  const expected = normalizeRigBoneName(
    Object.hasOwn(ROCKETBOX_RIG.bones, nameOrRole)
      ? ROCKETBOX_RIG.bones[nameOrRole as RocketboxBoneRole]
      : nameOrRole,
  ).toLowerCase();
  let found: Object3D | undefined;
  root.traverse((object) => {
    if (!found && normalizeRigBoneName(object.name).toLowerCase() === expected) found = object;
  });
  return found;
}

export function isRocketboxFingerBone(name: string): boolean {
  return ROCKETBOX_RIG.fingerBonePattern.test(name);
}

export function rocketboxFingerSegment(name: string): number | null {
  const match = ROCKETBOX_RIG.fingerBonePattern.exec(name);
  return match ? Number(match[1] || 0) : null;
}

export function rocketboxBodyShapeBoneKey(name: string): string {
  return normalizeRigBoneName(name).replace(/^Bip01 /i, '');
}
