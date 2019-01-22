
import {File} from './file'
import {Map} from './map'

export {FileMap}

abstract class FileMap extends Map {
  private file: File

  protected constructor(file: File, parent: Map | null, properties?: any) {
    super(parent, properties)
    this.file = file
  }

  getSerializablePropertyKeys(): any {
    return super.getSerializablePropertyKeys()
        .filter(key => !(this.getProperty(key) instanceof FileMap))
  }

  protected autoSave(): any {
    if (!this.file.options.autosave) return undefined
    if (this.file.options.saveSync) this.saveSync()
    return this.file.options.saveSync ? undefined : this.save()
  }

  protected abstract serialize(): string | Buffer

  async save() {
    if (this.file.isDirectory) {
      for (let key of super.getSerializablePropertyKeys()
          .filter(key => this.getProperty(key) instanceof FileMap)) {
        await this.getProperty(key).save()
      }

      if (this.getSerializablePropertyKeys().length === 0) return
    }

    try {
      await this.file.write(this.serialize())
    } catch (err) {
      throw `Failed to write config '${this.file.path}' due to ${err}`
    }
  }

  saveSync() {
    if (this.file.isDirectory) {
      for (let key of super.getSerializablePropertyKeys()
          .filter(key => this.getProperty(key) instanceof FileMap)) {
        this.getProperty(key).saveSync()
      }

      if (this.getSerializablePropertyKeys().length === 0) return
    }

    try {
      this.file.writeSync(this.serialize())
    } catch (err) {
      throw `Failed to write config '${this.file.path}' due to ${err}`
    }
  }
}